import express, { Request, Response } from "express";
import { createServer } from "http";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Bot, webhookCallback } from "node-telegram-bot-api";
import { botData } from "./bot-data";

dotenv.config();

// ────────────────────────────────────────────────────────────────────────────
// Configuration
// ────────────────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 4000;
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_API_KEY || "";
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const WEBHOOK_URL = process.env.WEBHOOK_URL || ""; // e.g. https://yourdomain.com

// ────────────────────────────────────────────────────────────────────────────
// Gemini AI setup
// ────────────────────────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(GEMINI_KEY);

const systemInstructionParts =
  botData.intents?.map(
    (intent) =>
      `- If asked about ${intent.keywords.join(", ")}, answer with information similar to: "${intent.response}"`,
  ) || [];

const systemInstruction = `You are Zamar's automated Telegram assistant. You help answer questions about his professional background and portfolio.
Here is some information about Zamar based on his pre-programmed intents:
${systemInstructionParts.join("\n")}

Keep your responses conversational, concise, and helpful. Format for Telegram (use markdown sparingly).
If the question is completely unrelated, respond with something similar to: "${botData.defaultResponse}"`;

// ────────────────────────────────────────────────────────────────────────────
// Uptime / stats tracking
// ────────────────────────────────────────────────────────────────────────────
const startTime = Date.now();
let messagesHandled = 0;
let lastMessageAt: string | null = null;

// ────────────────────────────────────────────────────────────────────────────
// Express app
// ────────────────────────────────────────────────────────────────────────────
const app = express();
const server = createServer(app);

// Parse JSON bodies (needed for Telegram webhook payloads)
app.use(express.json());

// Default route
app.get("/", (_req: Request, res: Response) => {
  res.send("Tele-Agent is running!");
});

// Health endpoint for uptime monitoring (UptimeRobot, BetterStack, etc.)
app.get("/health", (_req: Request, res: Response) => {
  const uptimeMs = Date.now() - startTime;
  const uptimeSeconds = Math.floor(uptimeMs / 1000);
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = uptimeSeconds % 60;

  res.json({
    status: "ok",
    botUsername: botUsername || "pending...",
    uptime: `${hours}h ${minutes}m ${seconds}s`,
    uptimeMs,
    messagesHandled,
    lastMessageAt,
    geminiConfigured: !!GEMINI_KEY,
    webhookConfigured: !!WEBHOOK_URL,
    timestamp: new Date().toISOString(),
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Telegram Bot setup (v2.x middleware API)
// ────────────────────────────────────────────────────────────────────────────
if (!TELEGRAM_TOKEN) {
  console.error(
    "❌ TELEGRAM_BOT_API_KEY is not set in .env — bot will not start.",
  );
  process.exit(1);
}

let botUsername: string | null = null;

const bot = new Bot(TELEGRAM_TOKEN);

// If a WEBHOOK_URL is provided, run in webhook mode via Express.
// Otherwise, fall back to long-polling for local development.
const useWebhook = !!WEBHOOK_URL;

// ────────────────────────────────────────────────────────────────────────────
// Generate a response using Gemini (with keyword-based fallback)
// ────────────────────────────────────────────────────────────────────────────
async function generateResponse(userMessage: string): Promise<string> {
  // Try Gemini first
  try {
    if (!GEMINI_KEY) {
      throw new Error("GEMINI_API_KEY is not set");
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      systemInstruction: systemInstruction,
    });

    const result = await model.generateContent(userMessage);
    const text = result.response.text();
    console.log(`✨ Gemini response generated (${text.length} chars)`);
    return text;
  } catch (error) {
    console.error("Gemini API error, falling back to keyword matching:", error);
  }

  // Fallback: keyword-based matching from bot-data
  const lowercaseText = userMessage.toLowerCase();

  for (const intent of botData.intents || []) {
    if (intent.keywords.some((keyword) => lowercaseText.includes(keyword))) {
      return intent.response;
    }
  }

  return botData.defaultResponse || "I'm not quite sure about that.";
}

// ────────────────────────────────────────────────────────────────────────────
// /start command — greeting when user first opens the bot
// ────────────────────────────────────────────────────────────────────────────
bot.command("start", async (ctx) => {
  if (ctx.chat?.type !== "private") return;

  const name = ctx.from?.first_name || "there";
  const greeting =
    `Hey ${name}! 👋\n\n${botData.initialGreeting}\n\n` +
    `Try asking things like:\n` +
    `• "What are Zamar's skills?"\n` +
    `• "How can I contact him?"\n` +
    `• "Tell me about his projects"`;

  await ctx.reply(greeting);
});

// ────────────────────────────────────────────────────────────────────────────
// /help command
// ────────────────────────────────────────────────────────────────────────────
bot.command("help", async (ctx) => {
  if (ctx.chat?.type !== "private") return;

  const helpText =
    `🤖 *Zamar's Assistant Bot*\n\n` +
    `I can answer questions about:\n` +
    `• Skills & tech stack\n` +
    `• Projects & portfolio\n` +
    `• Work experience\n` +
    `• Education\n` +
    `• Contact information\n` +
    `• Services offered\n\n` +
    `Just type your question naturally — I'm powered by AI so I understand context!`;

  await ctx.reply(helpText, { parse_mode: "Markdown" });
});

// ────────────────────────────────────────────────────────────────────────────
// Handle incoming Telegram messages (private chats only)
// ────────────────────────────────────────────────────────────────────────────
bot.on("message", async (ctx) => {
  const msg = ctx.message;
  if (!msg) return;

  // Only respond in private chats (DMs)
  if (ctx.chat?.type !== "private") return;

  // Ignore non-text messages
  if (!msg.text) return;

  // Skip commands — they are already handled above
  if (msg.text.startsWith("/")) return;

  const chatId = ctx.chatId!;
  const userMessage = msg.text;
  const userName = ctx.from?.first_name || "there";

  console.log(`💬 [${userName}] ${userMessage}`);

  // Send a "typing…" indicator while we generate the response
  await bot.api.sendChatAction({ chat_id: chatId, action: "typing" });

  try {
    const responseText = await generateResponse(userMessage);

    await ctx.reply(responseText, { parse_mode: "Markdown" });
  } catch (error) {
    console.error("Error sending response:", error);

    // If Markdown parsing fails, retry without parse_mode
    try {
      const responseText = await generateResponse(userMessage);
      await ctx.reply(responseText);
    } catch (retryError) {
      console.error("Retry also failed:", retryError);
      await ctx.reply(
        "Sorry, I ran into an issue processing your message. Please try again!",
      );
    }
  }

  // Update stats
  messagesHandled++;
  lastMessageAt = new Date().toISOString();
});

// ────────────────────────────────────────────────────────────────────────────
// Error handling
// ────────────────────────────────────────────────────────────────────────────
bot.catch((err, ctx) => {
  console.error("Telegram bot error:", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// ────────────────────────────────────────────────────────────────────────────
// Webhook or polling setup + Express server start
// ────────────────────────────────────────────────────────────────────────────
if (useWebhook) {
  const webhookPath = `/bot${TELEGRAM_TOKEN}`;

  // Create a Web-standard webhook handler, then bridge it into Express
  const handleWebhook = webhookCallback(bot, { allowUnauthenticated: true });

  app.post(webhookPath, async (req: Request, res: Response) => {
    // Bridge Express req/res into a Web Request/Response for the v2 handler
    const body = JSON.stringify(req.body);
    const webRequest = new globalThis.Request(
      `http://localhost${webhookPath}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      },
    );
    const webResponse = await handleWebhook(webRequest);
    res.status(webResponse.status).send(await webResponse.text());
  });

  // Tell Telegram where to send updates
  bot.api
    .setWebhook({ url: `${WEBHOOK_URL}${webhookPath}` })
    .then(() => console.log(`✅ Webhook set: ${WEBHOOK_URL}${webhookPath}`))
    .catch((err) => console.error("❌ Failed to set webhook:", err));
} else {
  console.log("ℹ️  No WEBHOOK_URL set — running in long-polling mode (dev).");
  // Start the long-polling loop (runs in the background)
  bot.startPolling().catch((err) => console.error("Polling error:", err));
}

// ────────────────────────────────────────────────────────────────────────────
// Fetch bot info on startup
// ────────────────────────────────────────────────────────────────────────────
bot.api
  .getMe()
  .then((me) => {
    botUsername = me.username || null;
    console.log(`🤖 Bot started as @${botUsername}`);
  })
  .catch((err) => console.error("Failed to fetch bot info:", err));

// ────────────────────────────────────────────────────────────────────────────
// Start Express server
// ────────────────────────────────────────────────────────────────────────────
server.on("error", (err: any) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Retrying on port ${PORT + 1}...`,
    );
    server.listen(PORT + 1);
  } else {
    console.error("Server error:", err);
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Express server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

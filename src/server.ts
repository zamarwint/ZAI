import express, { Request, Response } from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { botData } from "./bot-data";

dotenv.config();

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Prepare system instruction for Gemini based on botData
const systemInstructionParts =
  botData.intents?.map(
    (intent: any) =>
      `- If asked about ${intent.keywords.join(", ")}, answer with information similar to: "${intent.response}"`,
  ) || [];
const systemInstruction = `You are Zamar's automated assistant. You help answer questions about his professional background and portfolio.
Here is some information about Zamar based on his pre-programmed intents:
${systemInstructionParts.join("\n")}

Keep your responses conversational, concise, and helpful. If the question is completely unrelated, respond with something similar to: "${botData.defaultResponse}"`;

const app = express();
const server = createServer(app);
const PORT = 4000;

// Handle uncaught exceptions so the server doesn't crash completely
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Enable CORS for your React frontend
// Using 'any' type cast here to bypass broken TypeScript definitions in socket.io/engine.io
const io: any = new Server(server, {
  cors: {
    origin: [
      "https://zamarwint.vercel.app",
      "http://localhost:3000",
      "https://zamarwint.xyz",
    ],
    methods: ["GET", "POST"],
  },
} as any);

// Default route
app.get("/", (req: Request, res: Response) => {
  res.send("Backend chat server is running!");
});

interface ChatMessage {
  senderId: string;
  text: string;
  timestamp: string;
}

io.on("connection", (socket: any) => {
  console.log("User connected:", socket.id);

  // Send an initial greeting
  setTimeout(() => {
    socket.emit("chat message", {
      senderId: "bot",
      text:
        botData.initialGreeting || "Hi there! I'm Zamar's automated assistant.",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  }, 1000);

  // Listen for chat messages from clients
  socket.on("chat message", async (msg: ChatMessage) => {
    if (!msg || typeof msg !== "object") return;

    // Echo the user's message back to THEM only (so it shows up in their UI)
    socket.emit("chat message", msg);

    let responseText =
      botData.defaultResponse || "I'm not quite sure about that.";

    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not set");
      }

      // Try to use Gemini first
      const model = genAI.getGenerativeModel({
        model: "gemini-3.1-flash-lite",
        systemInstruction: systemInstruction,
      });

      const result = await model.generateContent(msg.text);
      responseText = result.response.text();
      console.log("\n------------------\nGemini API response", result);
    } catch (error) {
      console.error(
        "Gemini API error or unavailable, falling back to basic bot logic:",
        error,
      );

      // Fallback: Bot logic using bot.json
      const lowercaseText = msg.text.toLowerCase();
      let fallbackResponse =
        botData.defaultResponse || "I'm not quite sure about that.";

      for (const intent of botData.intents || []) {
        if (
          intent.keywords.some((keyword: string) =>
            lowercaseText.includes(keyword),
          )
        ) {
          fallbackResponse = intent.response;
          break;
        }
      }
      responseText = fallbackResponse;
    }

    // Simulate bot typing delay (1 second) for automated responses
    setTimeout(() => {
      socket.emit("chat message", {
        senderId: "bot",
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    }, 1000);
  });

  socket.on("error", (err: any) => {
    console.error("Socket error:", err);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

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
  console.log(`Server is running on PORT: ${PORT}.`);
});

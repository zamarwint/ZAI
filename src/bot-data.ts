/**
 * Bot intent data migrated from agent-backend/src/bot.json.
 * Exported as typed constants so they can be used by the server action
 * and also by the client for the initial greeting message.
 */

export interface BotIntent {
  keywords: string[];
  response: string;
}

export interface BotData {
  defaultResponse: string;
  initialGreeting: string;
  intents: BotIntent[];
}

export const botData: BotData = {
  defaultResponse:
    "I'm a simple automated assistant, so I'm not quite sure how to answer that! Try asking about Zamar's 'projects', 'skills', 'experience', 'education', or 'contact'.",
  initialGreeting:
    "Hi there! I'm Zamar's automated assistant. You can ask me about his skills, projects, experience, or how to contact him!",
  intents: [
    {
      keywords: [
        "hi",
        "hello",
        "hey",
        "greetings",
        "good morning",
        "good afternoon",
      ],
      response:
        "Hello! How can I help you today? You can ask me about Zamar's skills, experience, or projects.",
    },
    {
      keywords: [
        "contact",
        "email",
        "phone",
        "hire",
        "reach",
        "message",
        "call",
        "freelance",
      ],
      response:
        "You can reach out to Zamar directly via email at wintzamar@gmail.com or call him at +1 (876) 334-6720. He is always open to discussing new opportunities!",
    },
    {
      keywords: ["project", "portfolio", "work", "built", "made", "created"],
      response:
        "Zamar has worked on several impressive projects, including scalable full-stack web applications, custom AI tools, and real-time platforms. Feel free to browse the main portfolio page to see live demos and GitHub repositories!",
    },
    {
      keywords: [
        "skill",
        "tech",
        "stack",
        "languages",
        "frameworks",
        "tools",
        "know",
        "frontend",
        "backend",
      ],
      response:
        "Zamar specializes in modern full-stack web development. His core stack includes React, TypeScript, Next.js, Motion, Node.js, Express, Socket.IO for real-time features, Shadcn UI as his choice of UI library, PostgreSQL as his choice of database, Docker, and Git for version control.",
    },
    {
      keywords: ["who are you", "your name", "what are you", "bot"],
      response:
        "I'm a custom-built automated assistant designed by Zamar to help answer your questions about his professional background and portfolio!",
    },
    {
      keywords: ["experience", "job", "work history", "resume", "cv"],
      response:
        "Zamar has hands-on experience building full-stack applications from the ground up, designing custom architectures, and deploying production-ready code. If you'd like a formal resume, please reach out to him at wintzamar@gmail.com.",
    },
    {
      keywords: [
        "education",
        "school",
        "university",
        "degree",
        "study",
        "college",
      ],
      response:
        "Zamar has a strong foundation in computer science and software engineering principles. For specific details on his educational background, feel free to contact him directly.",
    },
    {
      keywords: ["github", "code", "repo", "source"],
      response:
        "You can find Zamar's open-source work and project repositories on his GitHub profile. Check the links on the main portfolio page!",
    },
    {
      keywords: ["location", "where", "live", "country", "city", "timezone"],
      response:
        "Zamar is based in Jamaica (EST/GMT-5) but is fully equipped and experienced in working remotely with clients worldwide.",
    },
    {
      keywords: ["services", "offer", "do you do", "can you build"],
      response:
        "Zamar offers full-stack web development services, including custom website creation, API development, real-time feature integration (like this chat!), and UI/UX implementation.",
    },
    {
      keywords: [
        "thanks",
        "thank you",
        "appreciate",
        "awesome",
        "cool",
        "great",
      ],
      response:
        "You're very welcome! If you have any other questions, just let me know.",
    },
    {
      keywords: ["bye", "goodbye", "see ya", "cya"],
      response: "Goodbye! Thanks for visiting the portfolio. Have a great day!",
    },
  ],
};

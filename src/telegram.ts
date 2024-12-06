import dotenv from "dotenv";
import { EventEmitter } from "events";
import TelegramBot from "node-telegram-bot-api";
import { KeywordManager } from "./keyword-manager";

// Load environment variables
dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
export const CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

console.log(
  "Initializing bot with token:",
  TELEGRAM_BOT_TOKEN ? "Token exists" : "No token!"
);

export const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

// Basic message handler for ALL messages
bot.on("message", (msg) => {
  console.log("Received message:", msg.text);
  const chatId = msg.chat.id;
  console.log("From chat ID:", chatId);
});

// Command to get chat ID
bot.onText(/\/chatid/, (msg) => {
  console.log("Received /chatid command");
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `Your Chat ID is: ${chatId}`);
});

// Command to test the bot
bot.onText(/\/test/, (msg) => {
  console.log("Received /test command");
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "Bot is working! 🚀");
});

// Command to set keyword
bot.onText(/\/setkeyword (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  if (chatId.toString() !== CHAT_ID) {
    bot.sendMessage(
      chatId,
      "Unauthorized: Only the bot owner can set keywords"
    );
    return;
  }

  const keyword = match?.[1];
  if (!keyword) {
    bot.sendMessage(chatId, "No keyword provided");
    return;
  }
  KeywordManager.getInstance().setKeyword(keyword);
  bot.sendMessage(chatId, `Keyword updated to: ${keyword}`);
});

// Command to get current keyword
bot.onText(/\/getkeyword/, (msg) => {
  const chatId = msg.chat.id;
  const keyword = KeywordManager.getInstance().getKeyword();
  bot.sendMessage(
    chatId,
    keyword ? `Current keyword: ${keyword}` : "No keyword set"
  );
});

// Startup confirmation
bot
  .getMe()
  .then((botInfo) => {
    console.log("Bot initialized successfully!");
    console.log("Bot username:", botInfo.username);
  })
  .catch((error) => {
    console.error("Failed to initialize bot:", error);
  });

interface BondingAddress {
  first_token_id: string;
  second_token_id: string;
  address: string;
}

// Add circuit breaker configuration
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute timeout
const MAX_FAILURES = 3;
const RESET_TIME = 300000; // 5 minutes

class TelegramCircuitBreaker extends EventEmitter {
  private failures: number = 0;
  private lastFailure: number = 0;
  private isOpen: boolean = false;

  checkState() {
    if (this.isOpen) {
      const now = Date.now();
      if (now - this.lastFailure >= RESET_TIME) {
        this.reset();
      }
    }
    return this.isOpen;
  }

  recordFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= MAX_FAILURES) {
      this.isOpen = true;
      this.emit("open");
    }
  }

  reset() {
    this.failures = 0;
    this.isOpen = false;
    this.emit("close");
  }
}

export const circuitBreaker = new TelegramCircuitBreaker();

// Add reconnection logic
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000;

// Add shutdown handling constants
const SHUTDOWN_TIMEOUT = 5000; // 5 seconds to cleanup
let isShuttingDown = false;

// Add cleanup function
export async function gracefulShutdown(): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log("Starting graceful shutdown...");

  try {
    // Stop polling first
    await Promise.race([
      bot.stopPolling(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Shutdown timeout")),
          SHUTDOWN_TIMEOUT
        )
      ),
    ]);

    // Close any pending operations
    circuitBreaker.removeAllListeners();

    console.log("Telegram bot shutdown complete");
  } catch (error) {
    console.error("Error during shutdown:", error);
  }
}

// Add at module level, before the functions
let activeConnections = 0;
const MAX_CONCURRENT_CONNECTIONS = 5;

// Remove these declarations from setupBotErrorHandling
function setupBotErrorHandling(bot: TelegramBot) {
  bot.on("error", async (error) => {
    console.error("Telegram bot error:", error);
    circuitBreaker.recordFailure();

    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      console.log(
        `Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`
      );

      setTimeout(() => {
        bot
          .stopPolling()
          .then(() => bot.startPolling())
          .then(() => {
            console.log("Successfully reconnected to Telegram");
            reconnectAttempts = 0;
            circuitBreaker.reset();
          })
          .catch((err) => console.error("Reconnection failed:", err));
      }, RECONNECT_DELAY);
    }
  });

  // Add connection pool monitoring
  bot.on("polling_error", (error) => {
    console.error("Polling error:", error);
    circuitBreaker.recordFailure();
    activeConnections = Math.max(0, activeConnections - 1);
  });

  bot.on("message", () => {
    lastSuccessfulPoll = Date.now();
    activeConnections++;
    if (activeConnections > MAX_CONCURRENT_CONNECTIONS) {
      console.warn(
        `High connection load: ${activeConnections} active connections`
      );
    }
  });
}

// Update sendTelegramAlert with better timeout handling
export const sendTelegramAlert = async (newAddress: BondingAddress) => {
  if (isShuttingDown) {
    console.log("Bot is shutting down, skipping alert");
    return;
  }

  if (circuitBreaker.checkState()) {
    console.log("Circuit breaker is open, skipping Telegram alert");
    return;
  }

  const message =
    `🔔 New bonding address detected!\n\n` +
    `First Token: ${newAddress.first_token_id}\n` +
    `Second Token: ${newAddress.second_token_id}\n` +
    `Address: ${newAddress.address}`;

  try {
    const timeoutPromise = new Promise((_, reject) => {
      const timeout = setTimeout(() => {
        clearTimeout(timeout);
        reject(new Error("Telegram request timeout"));
      }, CIRCUIT_BREAKER_TIMEOUT);
    });

    await Promise.race([
      bot.sendMessage(CHAT_ID, message).finally(() => {
        // Ensure we track completion regardless of success/failure
        activeConnections = Math.max(0, activeConnections - 1);
      }),
      timeoutPromise,
    ]);
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
    circuitBreaker.recordFailure();
    throw error;
  }
};

// Add health check endpoint
let lastSuccessfulPoll = Date.now();

export const isBotHealthy = () => {
  const now = Date.now();
  return (
    !circuitBreaker.checkState() &&
    now - lastSuccessfulPoll < CIRCUIT_BREAKER_TIMEOUT
  );
};

// Initialize error handling
setupBotErrorHandling(bot);

// Add shutdown handlers
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

if (!TELEGRAM_BOT_TOKEN || !CHAT_ID) {
  throw new Error(
    "Missing required environment variables: TELEGRAM_BOT_TOKEN or CHAT_ID"
  );
}

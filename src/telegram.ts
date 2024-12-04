import dotenv from "dotenv";
import TelegramBot from "node-telegram-bot-api";

// Load environment variables
dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

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

export const sendTelegramAlert = async (newAddress: any) => {
  const message =
    `🔔 New bonding address detected!\n\n` +
    `First Token: ${newAddress.first_token_id}\n` +
    `Second Token: ${newAddress.second_token_id}\n` +
    `Address: ${newAddress.address}`;

  try {
    await bot.sendMessage(CHAT_ID, message);
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
  }
};

// Error handling
bot.on("error", (error) => {
  console.error("Telegram bot error:", error);
});

// Polling error handling
bot.on("polling_error", (error) => {
  console.error("Polling error:", error);
});

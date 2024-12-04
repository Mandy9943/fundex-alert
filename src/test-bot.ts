import dotenv from "dotenv";
import { bot } from "./telegram";

dotenv.config();

console.log("Bot test script started...");

// Keep the script running
process.on("SIGINT", () => {
  bot.stopPolling();
  process.exit();
});

import dotenv from "dotenv";
// Load environment variables first
dotenv.config();

import { CONFIG } from "./config";
import { KeywordManager } from "./keyword-manager";
import abi from "./master.abi.json";
import { scQuery } from "./query";
import { loadAddresses, saveAddresses } from "./storage";
import { buyToken } from "./swap";
import { bot, CHAT_ID, sendTelegramAlert } from "./telegram";
import { waitForInitialSwap } from "./utils/transactionChecker";

let isChecking = false;

// Helper functions
const fetchScData = async () => {
  const result = await scQuery(CONFIG.SC_ADDRESS, abi, "getAllBondingMetadata");
  if (!result?.firstValue) {
    throw new Error("Invalid response format");
  }
  return result.firstValue.valueOf().map((item: any) => ({
    ...item,
    address: item.address.bech32(),
  }));
};

const processNewAddress = async (address: any) => {
  console.log("\n🆕 New address detected!");
  console.log(`   Address: ${address.address}`);
  console.log(
    `   Tokens: ${address.first_token_id} - ${address.second_token_id}`
  );

  await sendTelegramAlert(address);

  const keywordManager = KeywordManager.getInstance();
  if (keywordManager.matchesKeyword(address.first_token_id)) {
    await handleMatchingToken(address);
  }
};

const handleMatchingToken = async (address: any) => {
  console.log(`🎯 Token matches keyword! Waiting for initial swap...`);
  const swapDetected = await waitForInitialSwap(
    address.address,
    CONFIG.DEFAULT_TOKEN
  );

  if (swapDetected) {
    console.log(`🤖 Initial swap detected! Executing buy...`);
    try {
      const explorerUrl = await buyToken(
        address.address,
        address.first_token_id
      );
      // Send success message with more details
      await bot.sendMessage(
        CHAT_ID,
        `✅ Buy Transaction Successful!\n\n` +
          `Token: ${address.first_token_id}\n` +
          `Pair Address: ${address.address}\n` +
          `Transaction: ${explorerUrl}\n\n` +
          `🚀 Your buy order has been executed!`
      );
    } catch (error) {
      // Send error message if buy fails
      await bot.sendMessage(
        CHAT_ID,
        `❌ Buy Transaction Failed!\n\n` +
          `Token: ${address.first_token_id}\n` +
          `Error: ${(error as any)?.message}`
      );
    }
  } else {
    console.log(`⏰ Timeout waiting for initial swap`);
    await bot.sendMessage(
      CHAT_ID,
      `⏰ Timeout waiting for initial swap for ${address.first_token_id}`
    );
  }
};

// Main function refactored
const getScAddresses = async () => {
  if (isChecking) return;
  isChecking = true;

  try {
    const data = await fetchScData();
    const latest3 = data.reverse().slice(0, CONFIG.MAX_ADDRESSES_TO_CHECK);
    const storedAddresses = loadAddresses();
    saveAddresses(latest3);

    // Check for new addresses
    for (const address of latest3) {
      const isNew = !storedAddresses.some(
        (stored) => stored.address === address.address
      );
      if (isNew) {
        await processNewAddress(address);
      }
    }
  } catch (error) {
    console.error("\n❌ Unexpected error:", error);
  } finally {
    isChecking = false;
  }
};

// Update interval reference
setInterval(getScAddresses, CONFIG.CHECK_INTERVAL);

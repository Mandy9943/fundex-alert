import dotenv from "dotenv";
// Load environment variables first
dotenv.config();

import abi from "./master.abi.json";
import { scQuery } from "./query";
import { loadAddresses, saveAddresses } from "./storage";
import { sendTelegramAlert } from "./telegram";

const getScAddresses = async () => {
  console.log("\n🔍 Checking for new addresses...");

  const result = await scQuery(
    "erd1qqqqqqqqqqqqqpgqg0sshhkwaxz8fxu47z4svrmp48mzydjlptzsdhxjpd",
    abi,
    "getAllBondingMetadata"
  );
  const data = result.firstValue?.valueOf().map((item: any) => {
    return {
      ...item,
      address: item.address.bech32(),
    };
  });

  const latest3 = data.reverse().slice(0, 3);
  console.log("\n📊 Latest 3 addresses:");
  latest3.forEach((addr: any, index: number) => {
    console.log(`${index + 1}. ${addr.address}`);
    console.log(`   Tokens: ${addr.first_token_id} - ${addr.second_token_id}`);
  });

  const storedAddresses = loadAddresses();
  console.log("\n💾 Stored addresses count:", storedAddresses.length);

  // Check for new addresses
  let newAddressesFound = false;
  for (const address of latest3) {
    const isNew = !storedAddresses.some(
      (stored) => stored.address === address.address
    );

    if (isNew) {
      newAddressesFound = true;
      console.log("\n🆕 New address detected!");
      console.log(`   Address: ${address.address}`);
      console.log(
        `   Tokens: ${address.first_token_id} - ${address.second_token_id}`
      );
      await sendTelegramAlert(address);
    }
  }

  if (!newAddressesFound) {
    console.log("\n✅ No new addresses found");
  }

  // Save new addresses
  saveAddresses(latest3);
  console.log("\n💾 Addresses updated in storage");

  return latest3;
};

// Run periodically
const CHECK_INTERVAL = 30 * 1000; // 5 minutes
console.log(
  `\n⏰ Starting address monitor (checking every ${
    CHECK_INTERVAL / 1000
  } seconds)`
);

setInterval(() => {
  getScAddresses().catch((error) => {
    console.error("\n❌ Error checking addresses:", error);
  });
}, CHECK_INTERVAL);

// Initial check
getScAddresses().catch((error) => {
  console.error("\n❌ Error in initial address check:", error);
});

import axios from "axios";

const api = axios.create({
  baseURL: "https://api.elrond.com",
  timeout: 10000,
});

export const checkInitialSwapTransactions = async (
  receiverAddress: string,
  tokenId: string
): Promise<number> => {
  try {
    const { data } = await api.get<number>(
      `/transactions/count?receiver=${receiverAddress}&token=${tokenId}&status=success&function=initialSwap`
    );
    return data;
  } catch (error) {
    console.error("Error checking transaction count:", error);
    throw error;
  }
};

export const waitForInitialSwap = async (
  receiverAddress: string,
  tokenId: string,
  maxAttempts = 60 // 30 minutes maximum (30 seconds * 60)
): Promise<boolean> => {
  let attempts = 0;

  while (attempts < maxAttempts) {
    console.log(
      `Checking for initial swap (attempt ${attempts + 1}/${maxAttempts})...`
    );

    try {
      const count = await checkInitialSwapTransactions(
        receiverAddress,
        tokenId
      );
      console.log(receiverAddress);
      console.log(tokenId);
      console.log(count);

      if (count > 0) {
        console.log("✅ Initial swap detected!");
        return true;
      }

      console.log("⏳ No initial swap yet, waiting 30 seconds...");
      await new Promise((resolve) => setTimeout(resolve, 30000)); // 30 seconds delay
      attempts++;
    } catch (error) {
      console.error("Error while checking for initial swap:", error);
      await new Promise((resolve) => setTimeout(resolve, 30000)); // Still wait on error
      attempts++;
    }
  }

  console.log("❌ Timeout waiting for initial swap");
  return false;
};

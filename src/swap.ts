import axios from "axios";
import BigNumber from "bignumber.js";
import { World, e, envChain } from "xsuite";
import { CONFIG } from "./config";

const api = axios.create({
  baseURL: "https://api.multiversx.com",
  timeout: 40000,
});

const world = World.new({
  chainId: envChain.id(),
});

const loadWallet = () =>
  world.newWalletFromFile_unsafe(CONFIG.WALLET_FILE, CONFIG.WALLET_PASSWORD);

const swapToken = async ({
  address,
  tokenToReceive,
  tokenToSend,
  minAmountToReceive,
  amountToSend,
}: {
  address: string;
  tokenToReceive: string;
  tokenToSend: string;
  minAmountToReceive: number;
  amountToSend: number;
}) => {
  const wallet = await loadWallet();

  const result = await wallet.callContract({
    callee: address,
    gasLimit: 100_000_000,
    funcName: "swap",
    esdts: [
      {
        amount: Math.floor(amountToSend),
        nonce: 0,
        id: tokenToSend,
      },
    ],
    funcArgs: [e.Str(tokenToReceive), e.U(minAmountToReceive)],
  });

  return result;
};

export const buyToken = async (address: string, tokenToReceive: string) => {
  try {
    console.log("buyToken");
    const wallet = loadWallet().toString();
    const tokenToSend = CONFIG.DEFAULT_TOKEN;

    // Get token balance
    let data;
    try {
      const response = await api.get<any[]>(`/accounts/${wallet}/tokens`);
      data = response.data;
    } catch (error) {
      throw new Error(
        `Failed to fetch token balance: ${
          (error as any)?.message || "Network error"
        }`
      );
    }

    const tokenBalance = data.find((token) => token.identifier === tokenToSend);
    if (!tokenBalance) {
      throw new Error(`Token ${tokenToSend} not found in wallet`);
    }

    const amountToPay = new BigNumber(tokenBalance.balance).times(0.98);
    if (amountToPay.isNaN() || amountToPay.isLessThanOrEqualTo(0)) {
      throw new Error("Invalid amount calculated");
    }

    console.log("wallet:", wallet);
    console.log("Amount to pay:", amountToPay.toNumber());

    const result = await swapToken({
      address,
      tokenToSend: "ONE-f9954f",
      amountToSend: amountToPay.toNumber(),
      minAmountToReceive: new BigNumber(1).toNumber(),
      tokenToReceive,
    });

    return result.explorerUrl || "Transaction submitted (URL not available)";
  } catch (error) {
    console.error("\n❌ Error in buyToken:", (error as any)?.message);
    throw error; // Re-throw to be handled by the caller
  }
};

import { zeroAddress } from "@orbs-network/liquidity-hub-sdk";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { wagmiConfig } from "@/lib/wagmi-config";
import { SwapSteps } from "@/types";
import { getTransactionConfirmations } from "wagmi/actions";
import { networks } from "./networks";
import BN from "bignumber.js";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const toBigInt = (amount: string | number, decimals?: number) => {
  if (!amount) return BigInt(0);
  const num = Number(amount);
  return BigInt((num * 10 ** (decimals || 0)).toFixed(0));
};

export const toExactAmount = (
  amount?: string,
  decimals?: number,
  decimalScale?: number
) => {
  if (!decimals || !amount) return "";
  const percision = BN(10).pow(decimals || 0);
  const result = BN(amount).times(percision).idiv(percision).div(percision);
  if (decimalScale) {
    return result.toFixed(decimalScale);
  }
  return result.toString();
};
export const toRawAmount = (amount?: string, decimals?: number) => {
  if (!decimals || !amount) return "";
  return BN(amount).times(BN(10).pow(decimals)).decimalPlaces(0).toFixed();
};

export const fromBigNumberToStr = (
  amount: bigint | string,
  decimals?: number
) => {
  const numStr = typeof amount === "bigint" ? amount.toString() : amount;
  const precision = decimals || 0;

  if (precision > 0) {
    const integerPart = numStr.slice(0, -precision) || "0";
    const fractionalPart = numStr.slice(-precision).padStart(precision, "0");

    return `${integerPart}.${fractionalPart}`;
  } else {
    return numStr;
  }
};

export const fromBigNumber = (
  amount: bigint | string | undefined | null,
  decimals?: number
) => {
  if (amount === null || typeof amount === "undefined") return 0;

  return Number(fromBigNumberToStr(amount, decimals));
};

export const nativeTokenAddresses = [
  zeroAddress,
  "0x0000000000000000000000000000000000001010",
  "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
  "0x000000000000000000000000000000000000dEaD",
  "0x000000000000000000000000000000000000800A",
];

export function eqIgnoreCase(a: string, b: string) {
  return a == b || a.toLowerCase() == b.toLowerCase();
}

export const isNativeAddress = (address?: string) =>
  !!nativeTokenAddresses.find((a) => eqIgnoreCase(a, address || ""));

export const resolveNativeTokenAddress = (address?: string) =>
  isNativeAddress(address) ? networks.poly.wToken.address : address;

const dollarDisplay = Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const cryptoDisplay = Intl.NumberFormat("en-US", {
  style: "decimal",
  minimumFractionDigits: 0,
  maximumFractionDigits: 5,
});

function formatAddress(address: string): string {
  return address.length >= 8
    ? `${address.slice(0, 4)}...${address.slice(-4)}`
    : address;
}

export const format = {
  dollar: dollarDisplay.format,
  crypto: cryptoDisplay.format,
  address: formatAddress,
};

export const getMinAmountOut = (slippage: number, _destAmount: string) => {
  const slippageFactor = BigInt(1000 - Math.floor(slippage * 10)); // 0.5% becomes 995

  // Convert priceRoute.destAmount to BigInt
  const destAmount = BigInt(_destAmount);

  // Calculate the minimum amount considering slippage
  return ((destAmount * slippageFactor) / BigInt(1000)).toString();
};

export const enum ErrorCodes {
  InsufficientBalance = "Insufficient balance",
  EnterAmount = "Enter amount",
}

export function getQuoteErrorMessage(errorCode: string) {
  switch (errorCode) {
    case "ldv":
      return "Minimum trade amount is $30";
    default:
      return "An unknown error occurred";
  }
}

type GetStepsArgs = {
  noWrap?: boolean;
  inTokenAddress: string;
  requiresApproval: boolean;
};

export function getSteps({
  noWrap,
  inTokenAddress,
  requiresApproval,
}: GetStepsArgs) {
  const steps: SwapSteps[] = [];

  if (!noWrap && isNativeAddress(inTokenAddress)) {
    steps.push(SwapSteps.Wrap);
  }

  if (requiresApproval) {
    steps.push(SwapSteps.Approve);
  }

  steps.push(SwapSteps.Swap);

  return steps;
}

export async function promiseWithTimeout<T>(
  promise: Promise<T>,
  timeout: number
): Promise<T> {
  let timer: NodeJS.Timeout | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("timeout"));
    }, timeout);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    if (timer) clearTimeout(timer);
    return result;
  } catch (error) {
    if (timer) clearTimeout(timer);
    throw error;
  }
}

export async function waitForConfirmations(
  txHash: `0x${string}`,
  maxConfirmations: number,
  maxTries: number
) {
  for (let i = 0; i < maxTries; i++) {
    try {
      const confirmations = await getTransactionConfirmations(wagmiConfig, {
        hash: txHash,
      });

      if (confirmations >= maxConfirmations) {
        break;
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      /// console.error(error)
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

export function getErrorMessage(
  error: unknown,
  placeholder = "An unknown error occurred"
) {
  const err = error as Error;
  const errorMessage = "message" in err ? err.message : placeholder;

  return errorMessage;
}

export function getLiquidityProviderName(isLiquidityHubTrade: boolean) {
  if (isLiquidityHubTrade) {
    return "Liquidity Hub";
  }
  return "ParaSwap";
}

export const makeElipsisAddress = (address?: string, padding = 6): string => {
  if (!address) return "";
  return `${address.substring(0, padding)}...${address.substring(
    address.length - padding
  )}`;
};

export const isTxRejected = (error: any) => {
  if (error?.message) {
    return (
      error.message?.toLowerCase()?.includes("rejected") ||
      error.message?.toLowerCase()?.includes("denied")
    );
  }
};

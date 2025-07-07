import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { wagmiConfig } from '@/lib/wagmi-config';
import { SwapSteps } from '@/types';
import { getTransactionConfirmations } from 'wagmi/actions';
import { formatUnits, parseUnits } from 'viem';
import { getNetwork } from './networks';
import { nativeTokenAddresses } from '@/trade/swap/consts';
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getWrappedNativeAddress = (chainId?: number, address?: string) => {
  if (!chainId) return address;
  const network = getNetwork(chainId);
  return isNativeAddress(address) ? network?.wToken.address : address;
};

export const toExactAmount = (amount?: string, decimals?: number) => {
  if (!decimals || !amount) return '';
  try {
    return formatUnits(BigInt(amount), decimals);
  } catch (error) {
    console.error(error);
    return '';
  }
};
export const toRawAmount = (amount?: string, decimals?: number) => {
  if (!decimals || !amount) return '';
  try {
    return parseUnits(amount, decimals).toString();
  } catch (error) {
    console.error(error);
    return '';
  }
};



export function eqIgnoreCase(a: string, b: string) {
  return a == b || a.toLowerCase() == b.toLowerCase();
}

export const isNativeAddress = (address?: string) =>
  !!nativeTokenAddresses.find((a) => eqIgnoreCase(a, address || ''));

const dollarDisplay = Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const cryptoDisplay = Intl.NumberFormat('en-US', {
  style: 'decimal',
  minimumFractionDigits: 0,
  maximumFractionDigits: 5,
});

function formatAddress(address: string): string {
  return address.length >= 8 ? `${address.slice(0, 4)}...${address.slice(-4)}` : address;
}

export const format = {
  dollar: dollarDisplay.format,
  crypto: cryptoDisplay.format,
  address: formatAddress,
};

export const amountMinusSlippage = (slippage: number, _destAmount: string) => {
  const slippageFactor = BigInt(1000 - Math.floor(slippage * 10)); // 0.5% becomes 995

  // Convert priceRoute.destAmount to BigInt
  const destAmount = BigInt(_destAmount);

  // Calculate the minimum amount considering slippage
  return ((destAmount * slippageFactor) / BigInt(1000)).toString();
};

export const enum ErrorCodes {
  InsufficientBalance = 'Insufficient balance',
  EnterAmount = 'Enter amount',
}

export function getQuoteErrorMessage(errorCode?: string) {
  if (!errorCode) return '';
  switch (errorCode) {
    case 'ldv':
      return 'Minimum trade amount is $30';
    default:
      return 'An unknown error occurred';
  }
}

type GetStepsArgs = {
  noWrap?: boolean;
  inTokenAddress: string;
  requiresApproval: boolean;
};

export function getSteps({ noWrap, inTokenAddress, requiresApproval }: GetStepsArgs) {
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
    await new Promise((resolve) => setTimeout(resolve, 3_000));
  }
}

export function getErrorMessage(error: unknown, placeholder = 'An unknown error occurred') {
  const err = error as Error;
  const errorMessage = 'message' in err ? err.message : placeholder;

  return errorMessage;
}

export function getLiquidityProviderName(isLiquidityHubTrade: boolean) {
  if (isLiquidityHubTrade) {
    return 'Liquidity Hub';
  }
  return 'ParaSwap';
}

export const makeElipsisAddress = (address?: string, padding = 6): string => {
  if (!address) return '';
  return `${address.substring(0, padding)}...${address.substring(address.length - padding)}`;
};

export const isTxRejected = (error: Error) => {
  if (error?.message) {
    return (
      error.message?.toLowerCase()?.includes('rejected') ||
      error.message?.toLowerCase()?.includes('denied')
    );
  }
};

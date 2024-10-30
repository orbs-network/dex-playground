import { ErrorCodes, toExactAmount } from "@/lib/utils";
import { Token } from "@/types";
import { useMemo } from "react";
import {
  useTokenBalance,
} from "./useTokensWithBalances";
import BN from "bignumber.js";

/* Handles amount input errors */

export function useInputError({
  inputAmount,
  inToken,
}: {
  inToken: Token | null;
  inputAmount: string;
}) {
  const tokenBalance = useTokenBalance(inToken?.address);
  return useMemo(() => {
    if (!inputAmount) {
      return ErrorCodes.EnterAmount;
    }
    const balance = toExactAmount(tokenBalance, inToken?.decimals);

    if (BN(inputAmount).gt(balance)) {
      return ErrorCodes.InsufficientBalance;
    }
  }, [inputAmount, inToken, tokenBalance]);
}

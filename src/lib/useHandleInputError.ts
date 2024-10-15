import { ErrorCodes, fromBigNumber } from "@/lib/utils";
import { Token } from "@/types";
import { useMemo } from "react";
import {
  useTokenBalance,
  useTokensWithBalances,
} from "./useTokensWithBalances";

/* Handles amount input errors */
type UseHandleInputError = {
  inToken: Token | null;
  inputAmount: string;
};
export function useInputError({
  inputAmount,
  inToken,
}: UseHandleInputError) {
  const tokensWithBalances = useTokensWithBalances();
  const tokenBalance = useTokenBalance(inToken?.address);
  return useMemo(() => {
    if (!inToken || !tokensWithBalances) return;
    if (!inputAmount) {
      return ErrorCodes.EnterAmount;
    }
    const value = Number(inputAmount);
    const balance = fromBigNumber(tokenBalance, inToken.decimals);

    if (value > balance) {
      return ErrorCodes.InsufficientBalance;
    }
  }, [inputAmount, inToken, tokenBalance, tokensWithBalances]);
}

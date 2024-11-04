import { ErrorCodes } from "@/lib/utils";
import { Token } from "@/types";
import { useMemo } from "react";
import BN from "bignumber.js";
import { useTokenBalance } from "./useTokens";
import { useToRawAmount } from "@/trade/hooks";


/* Handles amount input errors */

export function useInputError({
  inputAmount,
  inToken,
}: {
  inToken: Token | null;
  inputAmount: string;
}) {
  const {balance} = useTokenBalance(inToken?.address);
  const parsedInputAmount = useToRawAmount(inputAmount, inToken?.decimals)
  return useMemo(() => {
    if(BN(inputAmount || '0').lte(0)) {
      return ErrorCodes.EnterAmount;
    }
    if (!balance) {
      return ErrorCodes.EnterAmount;
    }

    if (BN(parsedInputAmount).gt(balance)) {
      return ErrorCodes.InsufficientBalance;
    }
  }, [inputAmount, inToken, balance, parsedInputAmount]);
}

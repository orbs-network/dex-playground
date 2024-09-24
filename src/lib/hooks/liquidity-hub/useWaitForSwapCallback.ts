import { Quote } from "@orbs-network/liquidity-hub-sdk";
import { useCallback } from "react";
import { useLiquidityHub } from "./useLiquidityHub";

type WaitForSwapProps = {
  quote: Quote | null;
  signature: string | null;
};

export function useWaitForSwapCallback() {
  const liquidityHub = useLiquidityHub();
  return useCallback(
    async ({ quote, signature }: WaitForSwapProps) => {
      if (!signature || !quote) return;

      const txHash = await liquidityHub.swap(quote, signature);

      if (!txHash) {
        throw new Error("Swap failed");
      }

      return await liquidityHub.getTransactionDetails(txHash, quote);
    },
    [liquidityHub]
  );
}

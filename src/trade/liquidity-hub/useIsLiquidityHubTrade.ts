import { useMemo } from "react";
import { useLiquidityHubSwapContext } from "./context";
import { useParaswapMinAmountOut } from "./hooks";
import { useLiquidityHubQuote } from "./useLiquidityHubQuote";
import BN from "bignumber.js";

export const useIsLiquidityHubTrade = () => {
  const {
    state: { liquidityHubDisabled, proceedWithLiquidityHub },
  } = useLiquidityHubSwapContext();
  const liquidityHubQuote = useLiquidityHubQuote().data;
  const paraswapMinAmountOut = useParaswapMinAmountOut();

  return useMemo(() => {
    // Choose between liquidity hub and dex swap based on the min amount out
    if (proceedWithLiquidityHub) {
      return true;
    }
    if (liquidityHubDisabled) return false;

    return BN(liquidityHubQuote?.minAmountOut || 0).gt(
      paraswapMinAmountOut || 0
    );
  }, [
    liquidityHubDisabled,
    liquidityHubQuote?.minAmountOut,
    paraswapMinAmountOut,
    proceedWithLiquidityHub,
  ]);
};

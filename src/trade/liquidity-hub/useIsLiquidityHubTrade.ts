import { useMemo } from 'react';
import { useLiquidityHubSwapContext } from './useLiquidityHubSwapContext';
import { useParaswapMinAmountOut } from './hooks';
import { useLiquidityHubQuote } from './useLiquidityHubQuote';
import BN from 'bignumber.js';
import { useAppState } from '@/store';

export const useIsLiquidityHubTrade = () => {
  const {
    state: { liquidityHubDisabled, proceedWithLiquidityHub },
  } = useLiquidityHubSwapContext();
  const {forceLiquidityHub} = useAppState()
  const liquidityHubQuote = useLiquidityHubQuote().data;
  const paraswapMinAmountOut = useParaswapMinAmountOut();

  return useMemo(() => {
    if (forceLiquidityHub) {
      return true;
    }

    // Choose between liquidity hub and dex swap based on the min amount out
    if (proceedWithLiquidityHub) {
      return true;
    }
    if (liquidityHubDisabled) return false;

    return BN(liquidityHubQuote?.userMinOutAmountWithGas || 0).gt(
      paraswapMinAmountOut || 0
    );
  }, [
    forceLiquidityHub,
    liquidityHubDisabled,
    liquidityHubQuote?.minAmountOut,
    paraswapMinAmountOut,
    proceedWithLiquidityHub,
  ]);
};

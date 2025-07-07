import {
  useParaswapQuote,
  useInputError,
  amountMinusSlippage,
  useGetRequiresApproval,
  getWrappedNativeAddress,
} from '@/lib';
import { useAppState } from '@/store';
import { permit2Address } from '@orbs-network/liquidity-hub-sdk';
import { useMemo } from 'react';
import { Address } from 'viem';
import { useAccount } from 'wagmi';
import { QUOTE_REFETCH_INTERVAL } from './consts';
import { useLiquidityHubQuote } from './useLiquidityHubQuote';
import { useLiquidityHubSwapContext } from './context';

export const useParaswapMinAmountOut = () => {
  const { slippage } = useAppState();
  const optimalRate = useOptimalRate().data;
  return useMemo(() => {
    return amountMinusSlippage(slippage, optimalRate?.destAmount || '0');
  }, [optimalRate?.destAmount, slippage]);
};

export const useOptimalRate = () => {
  const {
    parsedInputAmount,
    state: { inToken, outToken },
  } = useLiquidityHubSwapContext();
  return useParaswapQuote({
    inToken: inToken?.address || '',
    outToken: outToken?.address || '',
    inAmount: parsedInputAmount,
    refetchInterval: QUOTE_REFETCH_INTERVAL,
  });
};

export const useLiquidityHubInputError = () => {
  const {
    state: { inToken, inputAmount },
  } = useLiquidityHubSwapContext();

  return useInputError({
    inputAmount,
    inToken,
  });
};
export const useLiquidityHubApproval = () => {
  const {chainId} = useAccount()
  const {
    parsedInputAmount,
    state: { inToken },
  } = useLiquidityHubSwapContext();
  const tokenAddress = getWrappedNativeAddress(chainId, inToken?.address);
  return useGetRequiresApproval(permit2Address, tokenAddress, parsedInputAmount);
};

export const useParaswapApproval = () => {
  const optimalRate = useOptimalRate().data;
  const {chainId} = useAccount()

  const tokenAddress = getWrappedNativeAddress(chainId, optimalRate?.srcToken);
  return useGetRequiresApproval(
    optimalRate?.tokenTransferProxy as Address,
    tokenAddress,
    optimalRate?.srcAmount
  );
};

export const useSwapOutAmount = () => {
  const { data: optimalRate } = useOptimalRate();
  const { data: quote } = useLiquidityHubQuote();
  const { isLiquidityHubOnly } = useAppState();

  return isLiquidityHubOnly ? quote?.referencePrice : optimalRate?.destAmount;
};

export const useQuoteLoading = () => {
  const { isLoading: optimalRateLoading } = useOptimalRate();
  const { isLoading: quoteLoading } = useLiquidityHubQuote();
  const { isLiquidityHubOnly } = useAppState();

  return isLiquidityHubOnly ? quoteLoading : optimalRateLoading;
};

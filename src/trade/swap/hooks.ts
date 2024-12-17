import {
  useParaswapQuote,
  useInputError,
  amountMinusSlippage,
  useGetRequiresApproval,
  networks,
  isNativeAddress,
} from '@/lib';
import { useAppState } from '@/store';
import { permit2Address } from '@orbs-network/liquidity-hub-sdk';
import { useMemo, useCallback } from 'react';
import { Address } from 'viem';
import { useAccount } from 'wagmi';
import { useLiquidityHubSwapContext } from './useLiquidityHubSwapContext';
import { QUOTE_REFETCH_INTERVAL } from './consts';
import { useLiquidityHubQuote } from './useLiquidityHubQuote';

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

const useNetwork = () => {
  const { chainId } = useAccount();

  return useMemo(() => {
    return Object.values(networks).find((network) => network.id === chainId);
  }, [chainId]);
};

const useNativeOrWrapped = (address?: string) => {
  const callback = useNativeOrWrappedAddressCallback();
  return useMemo(() => callback(address), [address, callback]);
};

const useNativeOrWrappedAddressCallback = () => {
  const network = useNetwork();
  return useCallback(
    (address?: string) => {
      return isNativeAddress(address) ? network?.wToken.address : address;
    },
    [network]
  );
};

export const useLiquidityHubApproval = () => {
  const {
    parsedInputAmount,
    state: { inToken },
  } = useLiquidityHubSwapContext();
  const tokenAddress = useNativeOrWrapped(inToken?.address);
  return useGetRequiresApproval(permit2Address, tokenAddress, parsedInputAmount);
};

export const useParaswapApproval = () => {
  const optimalRate = useOptimalRate().data;

  const tokenAddress = useNativeOrWrapped(optimalRate?.srcToken);
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

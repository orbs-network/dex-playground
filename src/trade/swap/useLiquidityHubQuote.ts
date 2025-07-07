import { isNativeAddress, useWrapOrUnwrapOnly } from '@/lib';
import { useAppState } from '@/store';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useNetwork } from '../hooks';
import { QUOTE_REFETCH_INTERVAL } from './consts';
import { useParaswapMinAmountOut } from './hooks';
import { useLiquidityHubSwapContext } from './context';

export function useLiquidityHubQuote() {
  const { chainId, address: account } = useAccount();
  const { slippage, isLiquidityHubOnly } = useAppState();

  const {
    state: { inToken, outToken },
    sdk,
    parsedInputAmount,
  } = useLiquidityHubSwapContext();
  const dexMinAmountOut = useParaswapMinAmountOut();
  const wToken = useNetwork()?.wToken.address;
  const inTokenAddress = isNativeAddress(inToken?.address) ? wToken : inToken?.address;
  const outTokenAddress = outToken?.address;
  const { isUnwrapOnly, isWrapOnly } = useWrapOrUnwrapOnly(inTokenAddress, outTokenAddress);

  const query = useQuery({
    queryKey: ['quote', inTokenAddress, outTokenAddress, parsedInputAmount, slippage],
    queryFn: ({ signal }) => {
      return sdk.getQuote({
        fromToken: inTokenAddress!,
        toToken: outTokenAddress!,
        inAmount: parsedInputAmount!,
        dexMinAmountOut: isLiquidityHubOnly ? '-1' : dexMinAmountOut,
        account,
        slippage,
        signal,
      });
    },
    enabled: Boolean(
      chainId &&
        inTokenAddress &&
        outTokenAddress &&
        Number(parsedInputAmount) > 0 &&
        !isUnwrapOnly &&
        !isWrapOnly &&
        account &&
        isLiquidityHubOnly
    ),
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    gcTime: 0,
    retry: 2,
    refetchInterval: QUOTE_REFETCH_INTERVAL,
  });

  const refetch = useCallback(async () => {
    return (await query.refetch()).data;
  }, [query]);

  return {
    ...query,
    refetch,
  };
}

import { QuoteArgs } from '@orbs-network/liquidity-hub-sdk'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLiquidityHubSDK } from './useLiquidityHubSDK'
import { useAccount } from 'wagmi'
import { useCallback, useMemo } from 'react'
import { networks, isNativeAddress, useWrapOrUnwrapOnly } from '@/lib'

export const QUOTE_REFETCH_INTERVAL = 20_000

// Fetches quote using Liquidity Hub sdk

export function useQuote(args: QuoteArgs, disabled?: boolean) {
  const liquidityHub = useLiquidityHubSDK()
  const queryClient = useQueryClient()
  const { chainId } = useAccount()

  // Check if the swap is wrap or unwrap only
  const { isUnwrapOnly, isWrapOnly } = useWrapOrUnwrapOnly(
    args.fromToken,
    args.toToken
  )

  // Flag to determine whether to getQuote
  const enabled = Boolean(
    !disabled &&
      chainId &&
      args.fromToken &&
      args.toToken &&
      Number(args.inAmount) > 0 &&
      !isUnwrapOnly &&
      !isWrapOnly
  )

  const queryKey = useMemo(
    () => ['quote', args.fromToken, args.toToken, args.inAmount, args.slippage],
    [args.fromToken, args.inAmount, args.slippage, args.toToken]
  )

  // Callback to call Liquidity Hub sdk getQuote
  const getQuote = useCallback(
    ({ signal }: { signal: AbortSignal }) => {
      const payload: QuoteArgs = {
        ...args,
        fromToken: isNativeAddress(args.fromToken)
          ? networks.poly.wToken.address
          : args.fromToken,
      }
      // The abort signal is optional
      return liquidityHub.getQuote({ ...payload, signal })
    },
    [liquidityHub, args]
  )

  // result from getQuote
  const query = useQuery({
    queryKey,
    queryFn: getQuote,
    enabled,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    gcTime: 0,
    retry: 2,
    refetchInterval: QUOTE_REFETCH_INTERVAL,
  })

  return useMemo(() => {
    return {
      // We return the result of getQuote, plus a function to get
      // the last fetched quote in react-query cache
      ...query,
      getLatestQuote: () =>
        queryClient.ensureQueryData({
          queryKey,
          queryFn: getQuote,
        }),
    }
  }, [query, queryClient, queryKey, getQuote])
}

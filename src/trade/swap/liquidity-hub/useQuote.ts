import { QuoteArgs } from '@orbs-network/liquidity-hub-sdk'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { eqIgnoreCase, isNativeAddress } from '@/lib/utils'
import { networks } from '@/lib/networks'
import { useLiquidityHubSDK } from './useLiquidityHubSDK'
import { useAccount } from 'wagmi'
import { useCallback, useMemo } from 'react'

export const QUOTE_REFETCH_INTERVAL = 20_000

// Fetches quote using Liquidity Hub sdk
export function useQuote(args: QuoteArgs) {
  const sdk = useLiquidityHubSDK()
  const queryClient = useQueryClient()
  const { chainId } = useAccount()

  // Evaluates whether tokens are to be wrapped/unwrapped only
  const { isUnwrapOnly, isWrapOnly } = useMemo(() => {
    return {
      isWrapOnly:
        eqIgnoreCase(networks.poly.wToken.address || '', args.toToken || '') &&
        isNativeAddress(args.fromToken || ''),
      isUnwrapOnly:
        eqIgnoreCase(
          networks.poly.wToken.address || '',
          args.fromToken || ''
        ) && isNativeAddress(args.toToken || ''),
    }
  }, [args.fromToken, args.toToken])

  // Flag to determine whether to getQuote
  const enabled = Boolean(
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

  // Callback to call liquidity hub sdk getQuote
  const getQuote = useCallback(
    ({ signal }: { signal: AbortSignal }) => {
      const payload: QuoteArgs = {
        ...args,
        fromToken: isNativeAddress(args.fromToken)
          ? networks.poly.wToken.address
          : args.fromToken,
      }
      console.log('Fetching Liquidity Hub quote...')
      return sdk.getQuote({ ...payload, signal })
    },
    [sdk, args]
  )

  // result from getQuote
  const query = useQuery({
    queryKey: [
      'quote',
      args.fromToken,
      args.toToken,
      args.inAmount,
      args.slippage,
    ],
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

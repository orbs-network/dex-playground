import { fetchQuote, QuoteArgs } from '@orbs-network/liquidity-hub-sdk'
import { useQuery } from '@tanstack/react-query'
import { useWrapOrUnwrapOnly } from './useWrapOrUnwrapOnly'
import { isNativeAddress } from '@/lib/utils'
import { networks } from '@/lib/networks'

export const QUOTE_REFETCH_INTERVAL = 20_000

export function useQuote(args: QuoteArgs) {
  const { isUnwrapOnly, isWrapOnly } = useWrapOrUnwrapOnly(
    args.fromToken,
    args.toToken
  )

  const enabled = Boolean(
    args.chainId &&
      args.fromToken &&
      args.toToken &&
      Number(args.inAmount) > 0 &&
      args.partner &&
      !isUnwrapOnly &&
      !isWrapOnly
  )

  const queryKey = ['quote', ...Object.values(args)]

  const payload: QuoteArgs = {
    ...args,
    fromToken: isNativeAddress(args.fromToken)
      ? networks.poly.wToken.address
      : args.fromToken,
  }

  return useQuery({
    queryKey,
    queryFn: () => {
      return fetchQuote(payload)
    },
    enabled,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    gcTime: 0,
    retry: 2,
    refetchInterval: QUOTE_REFETCH_INTERVAL,
  })
}

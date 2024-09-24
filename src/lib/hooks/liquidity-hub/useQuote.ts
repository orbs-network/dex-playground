import { QuoteArgs } from '@orbs-network/liquidity-hub-sdk'
import { useQuery } from '@tanstack/react-query'
import { useWrapOrUnwrapOnly } from './useWrapOrUnwrapOnly'
import { isNativeAddress } from '@/lib/utils'
import { networks } from '@/lib/networks'
import { useLiquidityHub } from './useLiquidityHub'

export const QUOTE_REFETCH_INTERVAL = 20_000

export function useQuote(args: QuoteArgs, lock = false) {
  const liquidityHub = useLiquidityHub()
  const { isUnwrapOnly, isWrapOnly } = useWrapOrUnwrapOnly(
    args.fromToken,
    args.toToken
  )

  const enabled =
    !lock &&
    Boolean(
        args.fromToken &&
        args.toToken &&
        Number(args.inAmount) > 0 &&
        !isUnwrapOnly &&
        !isWrapOnly
    )

  const queryKey = [
    'quote',
    args.fromToken,
    args.toToken,
    args.inAmount,
    args.slippage,
    lock
  ]

  const payload: QuoteArgs = {
    ...args,
    fromToken: isNativeAddress(args.fromToken)
      ? networks.poly.wToken.address
      : args.fromToken,
  }

  return useQuery({
    queryKey,
    queryFn: () => {
      console.log('fetching quote')
      return liquidityHub.getQuote(payload)
    },
    enabled,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    gcTime: 0,
    retry: 2,
    refetchInterval: QUOTE_REFETCH_INTERVAL,
  })
}

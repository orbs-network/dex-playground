import { fetchQuote, Quote, QuoteArgs } from '@orbs-network/liquidity-hub-sdk-2'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import BN from 'bignumber.js'
import { useWrapOrUnwrapOnly } from './useWrapOrUnwrapOnly'
import { getChainConfig } from '@/lib/utils'
import { isNativeAddress } from '@defi.org/web3-candies'

export function useQuote(args: QuoteArgs) {
  const chainConfig = getChainConfig(args.chainId)

  if (!chainConfig) {
    throw new Error('Chain config not found')
  }
  const { wToken } = chainConfig

  const queryClient = useQueryClient()

  const { isUnwrapOnly, isWrapOnly } = useWrapOrUnwrapOnly(
    args.fromToken,
    args.toToken
  )

  const enabled = Boolean(
    args.chainId &&
      args.fromToken &&
      args.toToken &&
      BN(args.inAmount || '0').gt(0) &&
      args.partner &&
      !isUnwrapOnly &&
      !isWrapOnly
  )

  const queryKey = ['quote', ...Object.values(args)]

  const payload: QuoteArgs = {
    ...args,
    fromToken: isNativeAddress(args.fromToken)
      ? wToken.address
      : args.fromToken,
  }

  return useQuery({
    queryKey,
    queryFn: () => {
      const sessionId = (
        queryClient.getQueryData(queryKey) as Quote | undefined
      )?.sessionId
      return fetchQuote({ ...payload, sessionId })
    },
    enabled,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    gcTime: 0,
    retry: 2,
  })
}

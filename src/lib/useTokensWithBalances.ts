import { useAccount } from 'wagmi'
import { useTokensList } from './useTokenList'
import { useBalances } from './useBalances'
import { networks } from '@/lib/networks'

export function useTokensWithBalances() {
  const account = useAccount()
  const { data: tokens, isLoading: tokensLoading } = useTokensList({
    chainId: networks.poly.id,
  })
  const {
    query: { data: balances, isLoading: balancesLoading, refetch },
    queryKey,
  } = useBalances({
    chainId: networks.poly.id,
    tokens: tokens || [],
    account: account.address,
    enabled: Boolean(tokens && account.address),
  })

  return {
    isLoading: tokensLoading || balancesLoading,
    tokensWithBalances: balances,
    queryKey,
    refetch,
  }
}


export const useTokenBalance = (tokenAddress?: string) => {
  const { tokensWithBalances } = useTokensWithBalances()
  return !tokenAddress ? '' :  tokensWithBalances?.[tokenAddress]?.balance.toString()
}
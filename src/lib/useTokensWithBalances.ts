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
    data: balances,
    isLoading: balancesLoading,
    refetch,
  } = useBalances({
    chainId: networks.poly.id,
    tokens: tokens || [],
    account: account.address,
    enabled: Boolean(tokens && account.address),
  })

  return {
    isLoading: tokensLoading || balancesLoading,
    tokensWithBalances: balances,
    refetch,
  }
}

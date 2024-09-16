import { useAccount } from 'wagmi'
import { useTokensList } from './useTokenList'
import { useBalances } from '../balances/useBalances'

export function useTokensWithBalances() {
  const account = useAccount()
  const { data: tokens, isLoading: tokensLoading } = useTokensList({
    chainId: 137,
  })
  const { data: balances, isLoading: balancesLoading } = useBalances({
    chainId: 137,
    tokens: tokens || [],
    account: account.address,
    enabled: Boolean(tokens && account.address),
  })

  return {
    isLoading: tokensLoading || balancesLoading,
    tokensWithBalances: balances,
  }
}

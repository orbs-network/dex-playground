import { Token, TokensWithBalances } from '@/types'
import { zeroAddress } from '@orbs-network/liquidity-hub-sdk'
import { useEffect, useMemo } from 'react'

/* Sets default tokens */
type UseDefaultTokens = {
  inToken: Token | null
  outToken: Token | null
  tokensWithBalances: TokensWithBalances | null | undefined
  setInToken: (token: Token) => void
  setOutToken: (token: Token) => void
}
export function useDefaultTokens({
  tokensWithBalances,
  inToken,
  outToken,
  setInToken,
  setOutToken,
}: UseDefaultTokens) {
  const defaultTokens = useMemo(() => {
    if (!tokensWithBalances) return []

    return [
      tokensWithBalances[zeroAddress].token,
      Object.values(tokensWithBalances).find((t) => t.token.symbol === 'USDT')
        ?.token || null,
    ].filter(Boolean) as Token[]
  }, [tokensWithBalances])

  useEffect(() => {
    if (!inToken && tokensWithBalances) {
      setInToken(defaultTokens[0])
    }

    if (!outToken && tokensWithBalances) {
      setOutToken(defaultTokens[1])
    }
  }, [
    inToken,
    defaultTokens,
    outToken,
    setInToken,
    setOutToken,
    tokensWithBalances,
  ])

  return defaultTokens
}

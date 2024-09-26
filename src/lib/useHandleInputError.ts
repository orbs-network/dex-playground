import { ErrorCodes, toBigInt } from '@/lib/utils'
import { Token, TokensWithBalances } from '@/types'
import { useEffect } from 'react'

/* Handles amount input errors */
type UseHandleInputError = {
  inToken: Token | null
  tokensWithBalances: TokensWithBalances | null | undefined
  debouncedInputAmount: string
  setInputError: (error: ErrorCodes | null) => void
}
export function useHandleInputError({
  debouncedInputAmount,
  inToken,
  setInputError,
  tokensWithBalances,
}: UseHandleInputError) {
  useEffect(() => {
    if (!inToken || !tokensWithBalances) return

    const valueBN = toBigInt(debouncedInputAmount, inToken.decimals)
    const balance = tokensWithBalances[inToken.address].balance

    if (valueBN > balance) {
      setInputError(ErrorCodes.InsufficientBalance)
      return
    }

    setInputError(null)
  }, [debouncedInputAmount, inToken, setInputError, tokensWithBalances])
}

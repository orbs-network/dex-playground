import { ErrorCodes, fromBigNumber } from '@/lib/utils'
import { Token, TokensWithBalances } from '@/types'
import { useEffect } from 'react'

/* Handles amount input errors */
type UseHandleInputError = {
  inToken: Token | null
  tokensWithBalances: TokensWithBalances | null | undefined
  inputAmount: string
  setInputError: (error: ErrorCodes | null) => void
}
export function useHandleInputError({
  inputAmount,
  inToken,
  setInputError,
  tokensWithBalances,
}: UseHandleInputError) {
  useEffect(() => {
    if (!inToken || !tokensWithBalances) return

    const value = Number(inputAmount)
    const balance = fromBigNumber(
      tokensWithBalances[inToken.address].balance,
      inToken.decimals
    )

    if (value > balance) {
      setInputError(ErrorCodes.InsufficientBalance)
      return
    }

    setInputError(null)
  }, [inputAmount, inToken, setInputError, tokensWithBalances])
}

import { Token } from '@/types'
import { Quote } from '@orbs-network/liquidity-hub-sdk'
import { useMemo } from 'react'
import { networks } from './networks'
import { usePriceUSD } from './usePriceUsd'
import { fromBigNumber } from './utils'

/* Calculates all display amounts for UI */
type UseAmounts = {
  inToken: Token | null
  outToken: Token | null
  inAmount: string
  quote: Quote | undefined
}
export function useAmounts({ inToken, outToken, inAmount, quote }: UseAmounts) {
  const { data: inPriceUsd } = usePriceUSD(networks.poly.id, inToken?.address)
  const { data: outPriceUsd } = usePriceUSD(networks.poly.id, outToken?.address)
  const { inAmountUsd, outAmountUsd, outAmount } = useMemo(() => {
    const inAmountUsd = (Number(inAmount || 0) * (inPriceUsd || 0))
      .toFixed(2)
      .toString()

    const outAmount = quote?.outAmount
      ? fromBigNumber(quote.outAmount, outToken?.decimals).toString()
      : ''

    const outAmountUsd = (Number(outAmount || 0) * (outPriceUsd || 0))
      .toFixed(2)
      .toString()

    return {
      inAmountUsd,
      outAmountUsd,
      outAmount,
    }
  }, [inAmount, inPriceUsd, outPriceUsd, outToken?.decimals, quote?.outAmount])

  return {
    inAmountUsd,
    outAmountUsd,
    outAmount,
    inPriceUsd,
    outPriceUsd,
  }
}

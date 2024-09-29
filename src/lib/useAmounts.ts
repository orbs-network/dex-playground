import { Token } from '@/types'
import { useMemo } from 'react'
import { networks } from './networks'
import { usePriceUSD } from './usePriceUsd'
import { fromBigNumber } from './utils'

/* Calculates all display amounts for UI */
type UseAmounts = {
  inToken: Token | null
  outToken: Token | null
  inAmount: string
  outAmount?: string
}
export function useAmounts(args: UseAmounts) {
  const { data: inPriceUsd } = usePriceUSD(networks.poly.id, args.inToken?.address)
  const { data: outPriceUsd } = usePriceUSD(networks.poly.id, args.outToken?.address)
  const { inAmountUsd, outAmountUsd, outAmount } = useMemo(() => {
    const inAmountUsd = (Number(args.inAmount || 0) * (inPriceUsd || 0))
      .toFixed(2)
      .toString()

    const outAmount = args.outAmount
      ? fromBigNumber( args.outAmount, args.outToken?.decimals).toString()
      : ''

    const outAmountUsd = (Number(outAmount || 0) * (outPriceUsd || 0))
      .toFixed(2)
      .toString()

    return {
      inAmountUsd,
      outAmountUsd,
      outAmount,
    }
  }, [args.inAmount, args.outAmount, inPriceUsd, outPriceUsd])

  return {
    inAmountUsd,
    outAmountUsd,
    outAmount,
    inPriceUsd,
    outPriceUsd,
  }
}

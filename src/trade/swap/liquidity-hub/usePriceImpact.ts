import { useMemo } from 'react'

type UsePriceImapctProps = {
  inAmountUsd?: string | number
  outAmountUsd?: string | number
}

// Calculates price impact of swap
export function usePriceImpact({
  inAmountUsd,
  outAmountUsd,
}: UsePriceImapctProps) {
  return useMemo(() => {
    const inNum = Number(inAmountUsd || '0')
    const outNum = Number(outAmountUsd || '0')

    if (!inAmountUsd || !outAmountUsd || inNum === 0 || outNum === 0) {
      return
    }

    return ((outNum / inNum - 1) * 100).toFixed(2).toString()
  }, [inAmountUsd, outAmountUsd])
}

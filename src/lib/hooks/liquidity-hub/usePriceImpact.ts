import BN from 'bignumber.js'
import { useMemo } from 'react'

type UsePriceImapctProps = {
  srcAmountUsd?: string | number
  dstAmountUsd?: string | number
}

export function usePriceImpact({
  srcAmountUsd,
  dstAmountUsd,
}: UsePriceImapctProps) {
  return useMemo(() => {
    if (
      !srcAmountUsd ||
      !dstAmountUsd ||
      BN(srcAmountUsd || '0').isZero() ||
      BN(dstAmountUsd || '0').isZero()
    ) {
      return
    }

    return BN(dstAmountUsd)
      .div(srcAmountUsd)
      .minus(1)
      .times(100)
      .toFixed(2)
      .toString()
  }, [srcAmountUsd, dstAmountUsd])
}

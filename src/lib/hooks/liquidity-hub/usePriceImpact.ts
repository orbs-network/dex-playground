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
    const srcNum = Number(srcAmountUsd || '0')
    const dstNum = Number(dstAmountUsd || '0')

    if (!srcAmountUsd || !dstAmountUsd || srcNum === 0 || dstNum === 0) {
      return
    }

    return ((dstNum / srcNum - 1) * 100).toFixed(2).toString()
  }, [srcAmountUsd, dstAmountUsd])
}

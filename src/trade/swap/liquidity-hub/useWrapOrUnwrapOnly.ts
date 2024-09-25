import { networks } from '@/lib/networks'
import { eqIgnoreCase, isNativeAddress } from '@/lib/utils'
import { useMemo } from 'react'

export function useWrapOrUnwrapOnly(
  fromTokenAddress?: string,
  toTokenAddress?: string
) {
  return useMemo(() => {
    return {
      isWrapOnly:
        eqIgnoreCase(
          networks.poly.wToken.address || '',
          toTokenAddress || ''
        ) && isNativeAddress(fromTokenAddress || ''),
      isUnwrapOnly:
        eqIgnoreCase(
          networks.poly.wToken.address || '',
          fromTokenAddress || ''
        ) && isNativeAddress(toTokenAddress || ''),
    }
  }, [fromTokenAddress, toTokenAddress])
}

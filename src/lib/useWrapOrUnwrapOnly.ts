import { useMemo } from 'react'
import { networks } from './networks'
import { eqIgnoreCase, isNativeAddress } from './utils'

export function useWrapOrUnwrapOnly(
  fromTokenAddress?: string,
  toTokenAddress?: string
) {
  // Evaluates whether tokens are to be wrapped/unwrapped only
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

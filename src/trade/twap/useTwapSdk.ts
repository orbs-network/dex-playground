import { useMemo } from 'react'
import { constructSDK, Configs } from '@orbs-network/twap-sdk'

export function useTwapSdk() {
  return useMemo(() => constructSDK({ config: Configs.QuickSwap }), [])
}

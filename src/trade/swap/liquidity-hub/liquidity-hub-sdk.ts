import { constructSDK } from '@orbs-network/liquidity-hub-sdk'
import { useMemo } from 'react'
import { useAccount } from 'wagmi'

export function useLiquidityHubSDK() {
  const { chainId } = useAccount()
  return useMemo(() => constructSDK({ partner: 'widget', chainId }), [chainId])
}

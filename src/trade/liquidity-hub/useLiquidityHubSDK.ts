import { constructSDK } from '@orbs-network/liquidity-hub-sdk'
import { useMemo } from 'react'
import { useAccount } from 'wagmi'

// Initialise Liquidity Hub sdk and provide in a React Hook
export function useLiquidityHubSDK() {
  const { chainId } = useAccount()
  return useMemo(() => constructSDK({ partner: 'widget', chainId }), [chainId])
}

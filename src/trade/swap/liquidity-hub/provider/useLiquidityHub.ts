import { useContext } from 'react'
import { LiquidityHubContext } from './liquidity-hub-provider'

export const useLiquidityHub = () => {
  return useContext(LiquidityHubContext)
}

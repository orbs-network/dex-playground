import { LiquidityHubProvider } from './liquidity-hub/provider/liquidity-hub-provider'
import { SwapPanel } from './swap-panel'

export function Swap() {
  return (
    <LiquidityHubProvider>
      <SwapPanel />
    </LiquidityHubProvider>
  )
}

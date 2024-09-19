import { isNativeAddress } from '@/lib/utils'
import { Token } from '@/types'
import { SwapStepId, SwapStepItem, SwapStepStatus } from './useSwapStore'

type GetSteps = {
  srcToken: Token
  dstToken: Token
  requiresApproval: boolean
}

export function getSteps({ dstToken, requiresApproval, srcToken }: GetSteps) {
  const _steps: SwapStepItem[] = [
    {
      stepId: SwapStepId.Swap,
      label: `Swap ${srcToken.symbol} to ${dstToken.symbol}`,
      status: SwapStepStatus.Idle,
    },
  ]

  // need to refetch the approval status
  if (requiresApproval) {
    _steps.unshift({
      stepId: SwapStepId.Approve,
      label: `Approve ${srcToken.symbol}`,
      status: SwapStepStatus.Idle,
    })
  }

  if (isNativeAddress(srcToken.address)) {
    _steps.unshift({
      stepId: SwapStepId.Wrap,
      label: `Wrap ${srcToken.symbol}`,
      status: SwapStepStatus.Idle,
    })
  }

  return _steps
}

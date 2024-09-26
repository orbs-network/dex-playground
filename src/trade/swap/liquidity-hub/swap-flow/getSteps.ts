import { isNativeAddress } from '@/lib/utils'
import { Steps } from '../types'

type GetStepsArgs = {
  inTokenAddress: string
  requiresApproval: boolean
}

export function getSteps({ inTokenAddress, requiresApproval }: GetStepsArgs) {
  const steps: Steps[] = []

  if (isNativeAddress(inTokenAddress)) {
    steps.push(Steps.Wrap)
  }

  if (requiresApproval) {
    steps.push(Steps.Approve)
  }

  steps.push(Steps.Swap)

  return steps
}

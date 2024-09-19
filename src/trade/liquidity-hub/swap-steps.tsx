import { SwapStep } from './swap-step'
import { SwapStepItem } from './useSwapStore'

type SwapStepsProps = {
  steps: SwapStepItem[]
}

export function SwapSteps({ steps }: SwapStepsProps) {
  return (
    <div className={'flex flex-col gap-1 items-end'}>
      {steps.map((step, index) => (
        <SwapStep key={index} {...step} />
      ))}
    </div>
  )
}

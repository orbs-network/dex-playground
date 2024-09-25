import { Steps, SwapStatus } from './liquidity-hub/types'
import { SwapStep } from './swap-step'

type SwapStepsProps = {
  steps: Steps[]
  currentStep: Steps | null
  status: SwapStatus
}

export function SwapSteps({ steps, currentStep, status }: SwapStepsProps) {
  const currentStepIndex = steps.findIndex((step) => step === currentStep)

  return (
    <div className={'flex flex-col gap-1 items-end'}>
      {steps.map((step, index) => (
        <SwapStep
          key={index}
          step={step}
          isCurrent={step === currentStep}
          isSuccess={
            index === steps.length - 1
              ? status === SwapStatus.Success
              : index < currentStepIndex && currentStep !== null
          }
          isFailed={status === SwapStatus.Failed && step === currentStep}
        />
      ))}
    </div>
  )
}

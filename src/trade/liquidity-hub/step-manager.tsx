import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SwapStepId, SwapStepStatus, useSwapStore } from './useSwapStore'
import { Card } from '@/components/ui/card'
import { DataDetails } from '@/components/ui/data-details'
import { format, fromBigNumber } from '@/lib/utils'
import { SwapSteps } from './swap-steps'
import { useWrapToken } from '@/lib/hooks/liquidity-hub/useWrapToken'
import { useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { useApproveAllowance } from '@/lib/hooks/liquidity-hub/useApproveAllowance'
import { XIcon } from 'lucide-react'

export default function StepManager() {
  const reset = useSwapStore((state) => state.reset)
  const currentStepId = useSwapStore((state) => state.currentStepId)
  const steps = useSwapStore((state) => state.steps)
  const quote = useSwapStore((state) => state.quote)
  const { mutate: wrapToken } = useWrapToken({
    account: quote?.user || '',
    srcAmount: BigInt(quote?.inAmount || 0),
    srcToken: quote?.inToken || null,
  })
  const { mutate: approve } = useApproveAllowance({
    account: quote?.user || '',
    srcToken: quote?.inToken || null,
  })

  const canCancel = useMemo(() => {
    return steps?.every((step) => step.status === SwapStepStatus.Idle)
  }, [steps])

  const currentStep = steps?.find((step) => step.stepId === currentStepId)

  useEffect(() => {
    if (!currentStepId) return
    if (currentStep && currentStep.status !== SwapStepStatus.Idle) return

    switch (currentStepId) {
      case SwapStepId.Wrap: {
        wrapToken()
        break
      }
      case SwapStepId.Approve: {
        approve()
        break
      }
      case SwapStepId.Swap: {
        console.log('Swap')
        break
      }
    }
  }, [approve, currentStep, currentStepId, wrapToken])

  if (!quote || !steps) {
    return null
  }

  return (
    <Dialog modal open={Boolean(steps)}>
      <DialogContent hideClose>
        {canCancel && (
          <div
            onClick={reset}
            className="cursor-pointer absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground p-2"
          >
            <XIcon className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </div>
        )}
        <DialogHeader>
          <DialogTitle>
            Buy{' '}
            {format.crypto(
              fromBigNumber(quote.outAmount, quote.outToken.decimals)
            )}{' '}
            {quote.outToken.symbol}
          </DialogTitle>
          <DialogDescription>
            Sell{' '}
            {format.crypto(
              fromBigNumber(quote.inAmount, quote.inToken.decimals)
            )}{' '}
            {quote.inToken.symbol}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Card className="bg-slate-900">
            <div className="p-4">
              <DataDetails
                data={{
                  Network: 'Polygon',
                  Recipient: format.address(quote.user),
                }}
              />
            </div>
          </Card>

          <Card className="bg-slate-900">
            <div className="p-4">
              <DataDetails
                data={{
                  Steps: <SwapSteps steps={steps} />,
                }}
              />
            </div>
          </Card>
          {currentStep && currentStep.status === SwapStepStatus.Error && (
            <Button variant="secondary" onClick={reset}>
              Start over
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

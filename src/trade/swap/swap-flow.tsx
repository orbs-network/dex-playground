import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {SwapStatus} from "@orbs-network/swap-ui"
import { Card } from '@/components/ui/card'
import { DataDetails } from '@/components/ui/data-details'
import { format, fromBigNumber } from '@/lib/utils'
import { SwapSteps } from './swap-steps'
import { Button } from '@/components/ui/button'
import { XIcon } from 'lucide-react'
import { useLiquidityHub } from './liquidity-hub/provider/useLiquidityHub'
import { useMemo } from 'react'

export function SwapFlow() {
  const {
    reset,
    state: {
      acceptedQuote: quote,
      steps,
      currentStep,
      inToken,
      outToken,
      status,
    },
  } = useLiquidityHub()

  const canCancel = useMemo(() => {
    return status !== SwapStatus.LOADING
  }, [status])

  console.log('swap flow')

  if (!quote || !steps || !inToken || !outToken || !currentStep) {
    return null
  }
  console.log('show swap flow')

  return (
    <Dialog modal open={Boolean(status)}>
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
            {format.crypto(fromBigNumber(quote.outAmount, outToken.decimals))}{' '}
            {outToken.symbol}
          </DialogTitle>
          <DialogDescription>
            Sell{' '}
            {format.crypto(fromBigNumber(quote.inAmount, inToken.decimals))}{' '}
            {inToken.symbol}
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
                  Steps: (
                    <SwapSteps
                      steps={steps}
                      currentStep={currentStep}
                      status={status}
                    />
                  ),
                }}
              />
            </div>
          </Card>
          {status === SwapStatus.FAILED && (
            <Button variant="secondary" onClick={reset}>
              Start over
            </Button>
          )}
          {status === SwapStatus.SUCCESS && (
            <Button variant="secondary" onClick={reset}>
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

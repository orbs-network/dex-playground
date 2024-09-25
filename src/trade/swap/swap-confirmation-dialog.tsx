import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ErrorCodes } from './liquidity-hub/errors'
import { Token } from '@/types'
import { format } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { DataDetails } from '@/components/ui/data-details'
import { usePriceImpact } from '@/trade/swap/liquidity-hub/usePriceImpact'
import { Quote } from '@orbs-network/liquidity-hub-sdk'
import { SwapSteps } from './swap-steps'
import { useCallback, useMemo, useState } from 'react'
import { useEstimateTotalGas } from '@/trade/swap/liquidity-hub/gas/useEstimateTotalGas'
import { useLiquidityHub } from './liquidity-hub/provider/useLiquidityHub'
import { useGetRequiresApproval } from './liquidity-hub/swap-flow/getRequiresApproval'
import { getSteps } from './liquidity-hub/swap-flow/getSteps'
import { SwapStatus } from './liquidity-hub/types'
import { useSwap } from './liquidity-hub/swap-flow/useSwap'

export type SwapConfirmationDialogProps = {
  inToken: Token
  outToken: Token
  outAmount: string
  inAmount: string
  inAmountUsd: string
  outAmountUsd: string
  quote: Quote
  outPriceUsd?: number
  account: string
  quoteError: Error | null
  inputError: string | null
}

export function SwapConfirmationDialog({
  quoteError,
  inputError,
  inAmount,
  outAmount,
  inToken,
  outToken,
  account,
  quote,
  outAmountUsd,
  inAmountUsd,
}: SwapConfirmationDialogProps) {
  const [open, setOpen] = useState(false)

  const priceImpact = usePriceImpact({
    outAmountUsd,
    inAmountUsd,
  })

  const requiresApproval = useGetRequiresApproval(quote)

  const {
    state: { steps: _steps, currentStep, status },
    beginSwap,
  } = useLiquidityHub()

  const steps = useMemo(() => {
    return getSteps({ inTokenAddress: inToken.address, requiresApproval })
  }, [inToken.address, requiresApproval])

  const { totalGasFeeUsd } = useEstimateTotalGas({
    account,
    quote,
    inToken,
    requiresApproval,
  })

  const { mutate: swap } = useSwap()

  const confirmSwap = useCallback(() => {
    console.log('confirm swap')
    beginSwap(quote, inToken, outToken, steps)
    swap({ quote, status, inTokenAddress: inToken.address })
    setOpen(false)
  }, [beginSwap, quote, inToken, outToken, steps, swap, status])

  return (
    <Dialog open={open} onOpenChange={(o) => setOpen(o)}>
      <DialogTrigger asChild>
        <Button
          className="mt-2"
          size="lg"
          disabled={Boolean(
            quoteError || inputError || !inAmount || !outAmount || _steps
          )}
        >
          {inputError === ErrorCodes.InsufficientBalance
            ? 'Insufficient balance'
            : 'Swap'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Buy {format.crypto(Number(outAmount))} {outToken?.symbol}
          </DialogTitle>
          <DialogDescription>
            Sell {format.crypto(Number(inAmount))} {inToken?.symbol}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Card className="bg-slate-900">
            <div className="p-4">
              <DataDetails
                data={{
                  Network: 'Polygon',
                  'Price Impact': `${priceImpact}%`,
                  'Gas Fee':
                    totalGasFeeUsd > 0.01
                      ? format.dollar(totalGasFeeUsd)
                      : '< $0.01',
                }}
              />
            </div>
          </Card>
          <Card className="bg-slate-900">
            <div className="p-4">
              <DataDetails
                data={{
                  Recipient: format.address(account),
                }}
              />
            </div>
          </Card>
          {steps && (
            <Card className="bg-slate-900">
              <div className="p-4">
                <DataDetails
                  data={{
                    Steps: (
                      <SwapSteps
                        steps={steps}
                        currentStep={currentStep}
                        status={SwapStatus.Idle}
                      />
                    ),
                  }}
                />
              </div>
            </Card>
          )}
          <Button size="lg" onClick={confirmSwap}>
            Swap {inToken?.symbol} for {outToken?.symbol}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

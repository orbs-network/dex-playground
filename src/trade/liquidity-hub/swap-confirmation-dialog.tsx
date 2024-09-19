import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ErrorCodes } from './errors'
import { Token } from '@/types'
import { format } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { DataDetails } from '@/components/ui/data-details'
import { usePriceImpact } from '@/lib/hooks/liquidity-hub/usePriceImpact'
import { Quote } from '@orbs-network/liquidity-hub-sdk'
import { useRequiresApproval } from '@/lib/hooks/liquidity-hub/useRequiresApproval'
import { SwapSteps } from './swap-steps'
import { EnrichedQuote, useSwapStore } from './useSwapStore'
import { useCallback, useMemo, useState } from 'react'
import { getSteps } from './getSteps'
import { useEstimateTotalGas } from '@/lib/hooks/liquidity-hub/useEstimateTotalGas'

export type SwapConfirmationDialogProps = {
  srcToken: Token | null
  dstToken: Token | null
  dstAmount: string
  srcAmount: string
  srcAmountUsd: string
  dstAmountUsd: string
  quote?: Quote
  dstPriceUsd?: number
  account: string
  quoteError: Error | null
  inputError: string | null
}

export function SwapConfirmationDialog({
  quoteError,
  inputError,
  srcAmount,
  dstAmount,
  srcToken,
  dstToken,
  account,
  quote,
  dstAmountUsd,
  srcAmountUsd,
}: SwapConfirmationDialogProps) {
  const [open, setOpen] = useState(false)

  const priceImpact = usePriceImpact({
    dstAmountUsd,
    srcAmountUsd,
  })

  const { data: requiresApproval } = useRequiresApproval({
    account,
    tokenAddress: srcToken?.address || '',
    srcToken,
    srcAmount: Number(srcAmount),
  })

  const _steps = useSwapStore((state) => state.steps)

  const steps = useMemo(() => {
    if (!dstToken || !srcToken) return []

    if (_steps) return _steps

    return getSteps({ dstToken, requiresApproval, srcToken })
  }, [_steps, dstToken, requiresApproval, srcToken])

  const beginSwap = useSwapStore((state) => state.beginSwap)

  const { totalGasFeeUsd } = useEstimateTotalGas({
    account,
    quote,
    srcToken,
    requiresApproval,
  })

  const confirmSwap = useCallback(() => {
    console.log('confirm swap')
    beginSwap(
      steps,
      quote && srcToken && dstToken
        ? ({ ...quote, inToken: srcToken, outToken: dstToken } as EnrichedQuote)
        : null
    )
    setOpen(false)
  }, [beginSwap, steps, quote, srcToken, dstToken])

  return (
    <Dialog open={open} onOpenChange={(o) => setOpen(o)}>
      <DialogTrigger asChild>
        <Button
          className="mt-2"
          size="lg"
          disabled={Boolean(
            quoteError || inputError || !srcAmount || !dstAmount || _steps
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
            Buy {format.crypto(Number(dstAmount))} {dstToken?.symbol}
          </DialogTitle>
          <DialogDescription>
            Sell {format.crypto(Number(srcAmount))} {srcToken?.symbol}
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
          {srcToken && dstToken && (
            <Card className="bg-slate-900">
              <div className="p-4">
                <DataDetails
                  data={{
                    Steps: <SwapSteps steps={steps} />,
                  }}
                />
              </div>
            </Card>
          )}
          <Button size="lg" onClick={confirmSwap}>
            Swap {srcToken?.symbol} for {dstToken?.symbol}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

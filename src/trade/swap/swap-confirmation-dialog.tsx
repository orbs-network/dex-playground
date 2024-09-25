import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Token } from '@/types'
import { format } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { usePriceImpact } from '@/trade/swap/liquidity-hub/usePriceImpact'
import { Quote } from '@orbs-network/liquidity-hub-sdk'
import { SwapFlow, SwapStep, SwapStatus } from '@orbs-network/swap-ui'
import { useMemo } from 'react'
import { useEstimateTotalGas } from '@/trade/swap/liquidity-hub/gas/useEstimateTotalGas'
import { DataDetails } from '@/components/ui/data-details'
import { Steps } from './liquidity-hub/types'
import { getSteps } from './liquidity-hub/swap-flow/getSteps'

export type SwapConfirmationDialogProps = {
  inToken: Token
  outToken: Token
  inAmount: string
  outAmount: string
  inAmountUsd: string
  outAmountUsd: string
  quote?: Quote
  outPriceUsd?: number
  account: string
  isOpen: boolean
  onClose: () => void
  confirmSwap: () => void
  requiresApproval: boolean
  approvalLoading: boolean
  swapStatus?: SwapStatus
  currentStep?: Steps
}

const useSteps = (requiresApproval: boolean, inToken?: Token) => {
  return useMemo((): SwapStep[] => {
    if (!inToken) return []

    const steps = getSteps({
      inTokenAddress: inToken.address,
      requiresApproval,
    })
    return steps.map((step) => {
      if (step === Steps.Wrap) {
        return {
          id: Steps.Wrap,
          title: 'Wrap',
          description: `Wrap ${inToken.symbol}`,
          image: inToken?.logoUrl,
        }
      }
      if (step === Steps.Approve) {
        return {
          id: Steps.Approve,
          title: 'Approve',
          description: `Approve ${inToken.symbol}`,
          image: inToken?.logoUrl,
        }
      }
      return {
        id: Steps.Swap,
        title: 'Swap',
        description: `Swap ${inToken.symbol}`,
        image: inToken?.logoUrl,
        timeout: 40_000,
      }
    })
  }, [inToken, requiresApproval])
}

export function SwapConfirmationDialog({
  inToken,
  outToken,
  account,
  quote,
  outAmountUsd,
  inAmountUsd,
  isOpen,
  onClose,
  inAmount,
  outAmount,
  confirmSwap,
  requiresApproval,
  approvalLoading,
  swapStatus,
  currentStep,
}: SwapConfirmationDialogProps) {
  const steps = useSteps(requiresApproval, inToken)

  const { totalGasFeeUsd } = useEstimateTotalGas({
    account,
    quote,
    inToken,
    requiresApproval,
  })

  const priceImpact = usePriceImpact({
    outAmountUsd,
    inAmountUsd,
  })

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogTitle>Swap</DialogTitle>
        <div className="flex flex-col gap-4">
          <div className="p-4">
            <SwapFlow
              inAmount={inAmount}
              outAmount={outAmount}
              mainContent={
                <SwapFlow.Main
                  fromTitle="Sell"
                  toTitle="Buy"
                  steps={steps}
                  inUsd={inAmountUsd}
                  outUsd={outAmountUsd}
                  currentStep={currentStep as number}
                />
              }
              swapStatus={swapStatus}
              successContent={<SwapFlow.Success explorerUrl="/" />}
              failedContent={<SwapFlow.Failed />}
              inToken={{
                symbol: inToken.symbol,
                logo: inToken.logoUrl,
              }}
              outToken={{
                symbol: outToken.symbol,
                logo: outToken.logoUrl,
              }}
            />
          </div>

          {!swapStatus && (
            <>
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

              <Button
                size="lg"
                onClick={() => confirmSwap()}
                disabled={approvalLoading}
              >
                Swap {inToken?.symbol} for {outToken?.symbol}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

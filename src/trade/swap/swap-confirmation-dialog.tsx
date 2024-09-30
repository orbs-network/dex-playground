import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { SwapSteps, Token } from '@/types'
import { Card } from '@/components/ui/card'
import { SwapFlow, SwapStep, SwapStatus } from '@orbs-network/swap-ui'
import { useMemo } from 'react'
import { DataDetails } from '@/components/ui/data-details'
import { format, getSteps } from '@/lib'

export type SwapConfirmationDialogProps = {
  inToken: Token
  outToken: Token
  inAmount: string
  outAmount: string
  inAmountUsd: string
  outAmountUsd: string
  outPriceUsd?: number
  account: string
  isOpen: boolean
  onClose: () => void
  confirmSwap: () => void
  requiresApproval: boolean
  approvalLoading: boolean
  swapStatus?: SwapStatus
  currentStep?: SwapSteps
  signature?: string
}

// Construct steps for swap to display in UI
const useSteps = (requiresApproval: boolean, inToken?: Token, signature?: string) => {
  return useMemo((): SwapStep[] => {
    if (!inToken) return []

    const steps = getSteps({
      inTokenAddress: inToken.address,
      requiresApproval,
    })
    return steps.map((step) => {
      if (step === SwapSteps.Wrap) {
        return {
          id: SwapSteps.Wrap,
          title: `Wrap ${inToken.symbol}`,
          description: `Wrap ${inToken.symbol}`,
          image: inToken?.logoUrl,
        }
      }
      if (step === SwapSteps.Approve) {
        return {
          id: SwapSteps.Approve,
          title: `Approve ${inToken.symbol}`,
          description: `Approve ${inToken.symbol}`,
          image: inToken?.logoUrl,
        }
      }
      return {
        id: SwapSteps.Swap,
        title: `Swap ${inToken.symbol}`,
        description: `Swap ${inToken.symbol}`,
        image: inToken?.logoUrl,
        timeout: signature ? 60_000 : 40_000,
      }
    })
  }, [inToken, requiresApproval, signature])
}

export function SwapConfirmationDialog({
  inToken,
  outToken,
  account,
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
  signature
}: SwapConfirmationDialogProps) {
  const steps = useSteps(requiresApproval, inToken,signature)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle>Swap</DialogTitle>
        <DialogDescription></DialogDescription>
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

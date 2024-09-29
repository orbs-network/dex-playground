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
import { DataDetails } from '@/components/ui/data-details'
import { format } from '@/lib'
import { useAccount } from 'wagmi'

export type SwapConfirmationDialogProps = {
  inToken: Token
  outToken: Token
  inAmount: string
  outAmount: string
  inAmountUsd: string
  outAmountUsd: string
  outPriceUsd?: number
  isOpen: boolean
  onClose: () => void
  confirmSwap: () => void
  swapStatus?: SwapStatus
  currentStep?: SwapSteps
  steps?: SwapStep[]
}


export function SwapConfirmationDialog({
  inToken,
  outToken,
  outAmountUsd,
  inAmountUsd,
  isOpen,
  onClose,
  inAmount,
  outAmount,
  confirmSwap,
  swapStatus,
  currentStep,
  steps
}: SwapConfirmationDialogProps) {
  const {address: account} = useAccount()

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
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
                      Recipient: format.address(account as string),
                    }}
                  />
                </div>
              </Card>

              <Button
                size="lg"
                onClick={() => confirmSwap()}
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

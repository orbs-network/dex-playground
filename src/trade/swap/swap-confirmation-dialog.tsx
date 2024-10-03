import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { LiquidityProvider, SwapSteps, Token } from '@/types'
import { Card } from '@/components/ui/card'
import { SwapFlow, SwapStep, SwapStatus } from '@orbs-network/swap-ui'
import { useMemo } from 'react'
import { DataDetails } from '@/components/ui/data-details'
import {
  format,
  fromBigNumber,
  getLiquidityProviderName,
  getSteps,
  resolveNativeTokenAddress,
  toBigNumber,
  useGetRequiresApproval,
} from '@/lib'
import { useAccount } from 'wagmi'
import { Address } from 'viem'

export type SwapConfirmationDialogProps = {
  inToken: Token
  outToken: Token
  isOpen: boolean
  onClose: () => void
  confirmSwap: () => void
  swapStatus?: SwapStatus
  currentStep?: SwapSteps
  signature?: string
  gasAmountOut?: string
  liquidityProvider: LiquidityProvider
  inAmount?: number
  inAmountUsd?: string
  outAmount?: number
  outAmountUsd?: string
  allowancePermitAddress: string
}

// Construct steps for swap to display in UI
const useSteps = (
  liquidityProvider: LiquidityProvider,
  requiresApproval: boolean,
  inToken?: Token,
  signature?: string
) => {
  return useMemo((): SwapStep[] => {
    if (!inToken) return []

    const steps = getSteps({
      liquidityProvider,
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
  }, [inToken, liquidityProvider, requiresApproval, signature])
}

export function SwapConfirmationDialog({
  inToken,
  outToken,
  isOpen,
  onClose,
  confirmSwap,
  swapStatus,
  currentStep,
  signature,
  gasAmountOut,
  liquidityProvider,
  inAmount,
  inAmountUsd,
  outAmount,
  outAmountUsd,
  allowancePermitAddress,
}: SwapConfirmationDialogProps) {
  const { address } = useAccount()

  const gasPrice = useMemo(() => {
    if (!outAmountUsd || !gasAmountOut) return 0
    const gas = fromBigNumber(gasAmountOut, outToken.decimals)
    const usd = Number(outAmountUsd) / Number(outAmount)
    return Number(gas) * usd
  }, [outAmountUsd, gasAmountOut, outToken.decimals, outAmount])

  const { requiresApproval, approvalLoading } = useGetRequiresApproval(
    allowancePermitAddress as Address,
    resolveNativeTokenAddress(inToken?.address),
    toBigNumber(inAmount || 0, inToken?.decimals)
  )

  const steps = useSteps(
    liquidityProvider,
    requiresApproval,
    inToken,
    signature
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle>Swap</DialogTitle>
        <DialogDescription></DialogDescription>
        <div className="flex flex-col gap-4">
          <div className="p-4">
            <SwapFlow
              inAmount={format.crypto(inAmount || 0)}
              outAmount={format.crypto(outAmount || 0)}
              mainContent={
                <SwapFlow.Main
                  fromTitle="Sell"
                  toTitle="Buy"
                  steps={steps}
                  inUsd={format.dollar(Number(inAmountUsd || '0'))}
                  outUsd={format.dollar(Number(outAmountUsd || '0'))}
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

          {!swapStatus && address && (
            <>
              <Card className="bg-slate-900">
                <div className="p-4 flex flex-col gap-2">
                  <DataDetails
                    data={{
                      Network: 'Polygon',
                      'Network fee': format.dollar(gasPrice),
                      'Routing source':
                        getLiquidityProviderName(liquidityProvider),
                    }}
                  />
                </div>
              </Card>
              <Card className="bg-slate-900">
                <div className="p-4">
                  <DataDetails
                    data={{
                      Recipient: format.address(address),
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

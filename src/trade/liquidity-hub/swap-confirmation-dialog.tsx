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
import {
  fromBigNumber,
  crypto,
  formatAddress,
  isNativeAddress,
} from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { DataDetails } from '@/components/ui/data-details'
import { usePriceImpact } from '@/lib/hooks/liquidity-hub/usePriceImpact'
import { Quote } from '@orbs-network/liquidity-hub-sdk'
import { useRequiresApproval } from '@/lib/hooks/liquidity-hub/useRequiresApproval'

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

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className="mt-2"
          size="lg"
          disabled={Boolean(
            quoteError || inputError || !srcAmount || !dstAmount
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
            Buy {crypto.format(Number(dstAmount))} {dstToken?.symbol}
          </DialogTitle>
          <DialogDescription>
            Sell {crypto.format(Number(srcAmount))} {srcToken?.symbol}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Card className="bg-slate-900">
            <div className="p-4">
              <DataDetails
                data={{
                  Network: 'Polygon',
                  'Price Impact': `${priceImpact}%`,
                  'Gas Fee': `${crypto.format(
                    fromBigNumber(
                      quote?.gasAmountOut || '0',
                      dstToken?.decimals
                    )
                  )} ${dstToken?.symbol}`,
                }}
              />
            </div>
          </Card>
          <Card className="bg-slate-900">
            <div className="p-4">
              <DataDetails
                data={{
                  Recipient: formatAddress(account),
                }}
              />
            </div>
          </Card>
          {srcToken && dstToken && (
            <Card className="bg-slate-900">
              <div className="p-4">
                <h3>Steps</h3>
                <div className="text-xs">
                  {isNativeAddress(srcToken.address) && (
                    <p>Wrap {srcToken.symbol}</p>
                  )}
                  {requiresApproval && <p>Approve {srcToken.symbol}</p>}
                  <p>Swap</p>
                </div>
              </div>
            </Card>
          )}
          <Button size="lg">
            Swap {srcToken?.symbol} for {dstToken?.symbol}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

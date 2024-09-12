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
import { Quote } from '@orbs-network/liquidity-hub-sdk-2'

export type SwapConfirmationDialogProps = {
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
}: SwapConfirmationDialogProps) {
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
          <DialogTitle>Swap Details</DialogTitle>
          <DialogDescription>
            {quoteError && (
              <div className="text-red-600">{quoteError.message}</div>
            )}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}

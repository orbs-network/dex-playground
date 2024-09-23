import {
  EnrichedQuote,
  SwapStepId,
  SwapStepStatus,
  useSwapStore,
} from '@/trade/liquidity-hub/useSwapStore'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { waitForSwap } from './waitForSwap'

type UseProcessingSwapProps = {
  quote: EnrichedQuote | null
  signature: string | null
}

export function useProcessingSwap({
  quote,
  signature,
}: UseProcessingSwapProps) {
  const updateStatus = useSwapStore((state) => state.updateStatus)

  return useMutation({
    mutationKey: ['useProcessingSwap', signature],
    mutationFn: async () => {
      if (!signature || !quote) return

      console.log('processing swap')

      try {
        const txDetails = await waitForSwap({ quote, signature })
        console.log('txDetails', txDetails)
        updateStatus(SwapStepId.Swap, SwapStepStatus.Complete)
        toast.success('Swap successful')
      } catch (error) {
        console.log(error)
        updateStatus(SwapStepId.Swap, SwapStepStatus.Error)

        const err = error as Error
        toast.error(
          'message' in err
            ? err.message.length > 100
              ? `${err.message.slice(0, 100)}...`
              : err.message
            : 'An error occurred while swapping your token'
        )
      }
    },
  })
}

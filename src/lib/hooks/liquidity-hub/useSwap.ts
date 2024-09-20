import { wagmiConfig } from '@/lib/wagmi-config'
import {
  EnrichedQuote,
  SwapStepId,
  SwapStepStatus,
  useSwapStore,
} from '@/trade/liquidity-hub/useSwapStore'
import { useMutation } from '@tanstack/react-query'
import { signTypedData } from 'wagmi/actions'
import { _TypedDataEncoder } from '@ethersproject/hash'
import { swap, getTxDetails } from '@orbs-network/liquidity-hub-sdk'
import { networks } from '@/lib/networks'
import { toast } from 'sonner'

type UseSwapProps = {
  quote: EnrichedQuote | null
}

export function useSwap({ quote }: UseSwapProps) {
  const updateStatus = useSwapStore((state) => state.updateStatus)

  return useMutation({
    mutationKey: ['useSwap', ...Object.values(quote || {})],
    mutationFn: async () => {
      if (!quote) return

      console.log('starting swap', quote.permitData)
      updateStatus(SwapStepId.Swap, SwapStepStatus.Loading)

      const { permitData } = quote

      const payload = _TypedDataEncoder.getPayload(
        permitData.domain,
        permitData.types,
        permitData.values
      )

      console.log(payload)

      try {
        const signature = await signTypedData(wagmiConfig, {
          ...payload,
          account: quote.user,
        })
        console.log('signature', signature)
        const txHash = await swap(quote, signature, networks.poly.id)
        console.log('txHash', txHash)

        const txDetails = await getTxDetails(txHash, networks.poly.id, quote)
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

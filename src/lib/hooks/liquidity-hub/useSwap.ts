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
import { toast } from 'sonner'
import { getTxDetails, swap } from '@orbs-network/liquidity-hub-sdk'
import { networks } from '@/lib/networks'

type UseSwapProps = {
  quote: EnrichedQuote | null
}

export function useSwap({ quote }: UseSwapProps) {
  const updateStatus = useSwapStore((state) => state.updateStatus)
  // const setSwapSignature = useSwapStore((state) => state.setSwapSignature)

  return useMutation({
    mutationKey: ['useSwap', ...Object.values(quote || {})],
    mutationFn: async () => {
      if (!quote) return

      console.log('starting swap', quote.permitData)
      updateStatus(SwapStepId.Swap, SwapStepStatus.Loading)

      const { permitData } = quote

      const populated = await _TypedDataEncoder.resolveNames(
        permitData.domain,
        permitData.types,
        permitData.values,
        async (name: string) => name
      )

      const payload = _TypedDataEncoder.getPayload(
        populated.domain,
        permitData.types,
        populated.value
      )

      console.log(payload)

      try {
        const signature = await signTypedData(wagmiConfig, payload)
        console.log('signature', signature)

        const txHash = await swap(quote, signature, networks.poly.id)

        if (!txHash) {
          throw new Error('Swap failed')
        }

        return await getTxDetails(txHash, networks.poly.id, quote)
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

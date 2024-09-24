import { wagmiConfig } from '@/lib/wagmi-config'
import {
  SwapStepId,
  SwapStepStatus,
  useSwapStore,
} from '@/trade/liquidity-hub/useSwapStore'
import { useMutation } from '@tanstack/react-query'
import { signTypedData } from 'wagmi/actions'
import { _TypedDataEncoder } from '@ethersproject/hash'
import { toast } from 'sonner'
import { Quote } from '@orbs-network/liquidity-hub-sdk'
import { useLiquidityHub } from './useLiquidityHub'

type UseSwapProps = {
  quote: Quote | null
}

export function useSwap({ quote }: UseSwapProps) {
  const updateStatus = useSwapStore((state) => state.updateStatus)
  // const setSwapSignature = useSwapStore((state) => state.setSwapSignature)
  const liquidityHub = useLiquidityHub()
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

        const txHash = await liquidityHub.swap(quote, signature)

        if (!txHash) {
          throw new Error('Swap failed')
        }
        console.log('txHash', txHash)

        const txDetails = await liquidityHub.getTransactionDetails(txHash, quote)
        console.log('txDetails', txDetails)
        updateStatus(SwapStepId.Swap, SwapStepStatus.Complete)

        return txDetails
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

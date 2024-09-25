import { wagmiConfig } from '@/lib/wagmi-config'

import { useMutation } from '@tanstack/react-query'
import { signTypedData } from 'wagmi/actions'
import { _TypedDataEncoder } from '@ethersproject/hash'
import { toast } from 'sonner'
import { getTxDetails, Quote, swap } from '@orbs-network/liquidity-hub-sdk'
import { networks } from '@/lib/networks'
import { useLiquidityHub } from '../provider/useLiquidityHub'
import { Steps, SwapStatus } from '../types'
import { getSteps } from './getSteps'
import { getRequiresApproval } from './getRequiresApproval'
import { approveAllowance } from './approveAllowance'
import { wrapToken } from './wrapToken'

export function useSwap() {
  const { updateStatus, setCurrentStep, setSteps } = useLiquidityHub()

  return useMutation({
    mutationFn: async ({
      quote,
      status,
      inTokenAddress,
    }: {
      quote: Quote
      status: SwapStatus
      inTokenAddress: string
    }) => {
      console.log('swapping', quote, status)
      console.log('inside', quote, status)
      if (!quote || status === SwapStatus.Loading) return

      updateStatus(SwapStatus.Loading)

      // requiresApproval
      const requiresApproval = await getRequiresApproval(quote)
      // getSteps
      const steps = getSteps({ inTokenAddress, requiresApproval })
      setSteps(steps)

      // wrapToken
      if (steps.includes(Steps.Wrap)) {
        setCurrentStep(Steps.Wrap)
        await wrapToken(quote)
      }

      // approveAllowance
      if (steps.includes(Steps.Approve)) {
        setCurrentStep(Steps.Approve)
        await approveAllowance(quote.user, quote.inToken)
      }

      // swap
      setCurrentStep(Steps.Swap)

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
        console.log('txHash', txHash)

        const txDetails = await getTxDetails(txHash, networks.poly.id, quote)
        console.log('txDetails', txDetails)
        updateStatus(SwapStatus.Success)

        return txDetails
      } catch (error) {
        console.log(error)
        updateStatus(SwapStatus.Failed)

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

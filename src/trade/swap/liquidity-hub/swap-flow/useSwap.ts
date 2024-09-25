import { wagmiConfig } from '@/lib/wagmi-config'
import { useMutation } from '@tanstack/react-query'
import { signTypedData } from 'wagmi/actions'
import { _TypedDataEncoder } from '@ethersproject/hash'
import { toast } from 'sonner'
import { Quote } from '@orbs-network/liquidity-hub-sdk'
import { SwapStatus } from '@orbs-network/swap-ui'
import { Steps } from '../types'
import { getSteps } from './getSteps'
import { approveAllowance } from './approveAllowance'
import { wrapToken } from './wrapToken'
import { useLiquidityHubSDK } from '../useLiquidityHubSDK'

export function useSwap() {
  const liquidityHub = useLiquidityHubSDK()
  return useMutation({
    mutationFn: async ({
      inTokenAddress,
      getQuote,
      requiresApproval,
      onAcceptQuote,
      setSwapStatus,
      setCurrentStep,
    }: {
      inTokenAddress: string
      getQuote: () => Promise<Quote>
      requiresApproval: boolean
      onAcceptQuote: (quote: Quote) => void
      setSwapStatus: (status?: SwapStatus) => void
      setCurrentStep: (step: Steps) => void
    }) => {
      // Fetch latest quote just before swap
      const quote = await getQuote()

      // Set swap status for UI
      setSwapStatus(SwapStatus.LOADING)

      // Get the steps required for swap e.g. [Wrap, Approve, Swap]
      const steps = getSteps({ inTokenAddress, requiresApproval })

      // If the inToken needs to be wrapped then wrap
      if (steps.includes(Steps.Wrap)) {
        setCurrentStep(Steps.Wrap)
        await wrapToken(quote)
      }

      // If an appropriate allowance for inToken has not been approved
      // then get user to approve
      if (steps.includes(Steps.Approve)) {
        setCurrentStep(Steps.Approve)
        await approveAllowance(quote.user, quote.inToken)
      }

      // Fetch the latest quote again after the approval
      const latestQuote = await getQuote()
      onAcceptQuote(latestQuote)

      setCurrentStep(Steps.Swap)

      // Encode the payload for the swap
      const { permitData } = latestQuote
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

      try {
        // Get user to sign the transaction for swap
        const signature = await promiseWithTimeout(
          signTypedData(wagmiConfig, payload),
          40_000
        )

        // Call liquidity hub sdk swap and wait for transaction hash
        const txHash = await liquidityHub.swap(latestQuote, signature as string)

        if (!txHash) {
          throw new Error('Swap failed')
        }

        // Fetch the successful transaction details
        const txDetails = await liquidityHub.getTransactionDetails(
          txHash,
          latestQuote
        )

        setSwapStatus(SwapStatus.SUCCESS)

        // TODO: maybe add a onSuccess callback so we can reset UI and fetch balances?

        return txDetails
      } catch (error) {
        console.error(error)
        setSwapStatus(SwapStatus.FAILED)
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

export async function promiseWithTimeout<T>(
  promise: Promise<T>,
  timeout: number
): Promise<T> {
  let timer: NodeJS.Timeout | null = null

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error('timeout'))
    }, timeout)
  })

  try {
    const result = await Promise.race([promise, timeoutPromise])
    if (timer) clearTimeout(timer)
    return result
  } catch (error) {
    if (timer) clearTimeout(timer)
    throw error
  }
}

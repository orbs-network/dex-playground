import { useMutation } from '@tanstack/react-query'
import { signTypedData } from 'wagmi/actions'
import { _TypedDataEncoder } from '@ethersproject/hash'
import { permit2Address, Quote } from '@orbs-network/liquidity-hub-sdk'
import { SwapStatus } from '@orbs-network/swap-ui'
import { useLiquidityHubSDK } from './useLiquidityHubSDK'
import { SwapSteps } from '@/types'
import {
  wagmiConfig,
  waitForConfirmations,
  promiseWithTimeout,
  getSteps,
  getErrorMessage,
  useParaswapBuildTxCallback,
  resolveNativeTokenAddress,
} from '@/lib'
import { OptimalRate, TransactionParams } from '@paraswap/sdk'
import { approveAllowance } from '@/lib/approveAllowance'
import { getRequiresApproval } from '@/lib/getRequiresApproval'
import { useAccount } from 'wagmi'
import { wrapToken } from '@/lib/wrapToken'

// Analytics events are optional for integration but are useful for your business insights
type AnalyticsEvents = {
  onRequest: () => void
  onSuccess: (result?: string) => void
  onFailure: (error: string) => void
}

async function wrapTokenCallback(quote: Quote, analyticsEvents: AnalyticsEvents) {
  try {
    console.log('Wrapping token...')
    analyticsEvents.onRequest()

    // Perform the deposit contract function
    const txHash = await wrapToken(quote.user, quote.inAmount)

    // Check for confirmations for a maximum of 20 seconds
    await waitForConfirmations(txHash, 1, 20)
    console.log('Token wrapped')
    analyticsEvents.onSuccess()

    return txHash
  } catch (error) {
    analyticsEvents.onFailure(
      getErrorMessage(error, 'An error occurred while wrapping your token')
    )
    throw error
  }
}

async function approveCallback(
  account: string,
  inToken: string,
  analyticsEvents: AnalyticsEvents
) {
  try {
    analyticsEvents.onRequest()
    // Perform the approve contract function
    const txHash = await approveAllowance(account, inToken, permit2Address)

    analyticsEvents.onSuccess(txHash)
    return txHash
  } catch (error) {
    analyticsEvents.onFailure(
      getErrorMessage(error, 'An error occurred while approving the allowance')
    )
    throw error
  }
}

async function signTransaction(quote: Quote, analyticsEvents: AnalyticsEvents) {
  // Encode the payload to get signature
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

  try {
    console.log('Signing transaction...')
    analyticsEvents.onRequest()

    // Sign transaction and get signature
    const signature = await promiseWithTimeout<string>(
      signTypedData(wagmiConfig, payload),
      40_000
    )

    console.log('Transaction signed')
    analyticsEvents.onSuccess(signature)

    return signature
  } catch (error) {
    console.error(error)

    analyticsEvents.onFailure(
      getErrorMessage(error, 'An error occurred while getting the signature')
    )
    throw error
  }
}

export function useLiquidityHubSwapCallback() {
  const liquidityHub = useLiquidityHubSDK()
  const buildParaswapTxCallback = useParaswapBuildTxCallback()
  const account = useAccount()

  return useMutation({
    mutationFn: async ({
      inTokenAddress,
      optimalRate,
      slippage,
      getQuote,
      onAcceptQuote,
      setSwapStatus,
      setCurrentStep,
      onSuccess,
      onFailure,
      setSignature,
    }: {
      inTokenAddress: string
      slippage: number
      optimalRate: OptimalRate
      getQuote: () => Promise<Quote>
      onAcceptQuote: (quote: Quote) => void
      setSwapStatus: (status?: SwapStatus) => void
      setCurrentStep: (step: SwapSteps) => void
      setSignature: (signature: string) => void
      onSuccess?: () => void
      onFailure?: () => void
    }) => {
      // Fetch latest quote just before swap
      const quote = await getQuote()
      // Set swap status for UI
      setSwapStatus(SwapStatus.LOADING)

      try {
        // Check if the inToken needs approval for allowance
        const requiresApproval = await getRequiresApproval(
          permit2Address,
          resolveNativeTokenAddress(inTokenAddress),
          quote.inAmount,
          account.address as string
        )

        // Get the steps required for swap e.g. [Wrap, Approve, Swap]
        const steps = getSteps({
          inTokenAddress,
          requiresApproval,
        })

        // If the inToken needs to be wrapped then wrap
        if (steps.includes(SwapSteps.Wrap)) {
          setCurrentStep(SwapSteps.Wrap)
          await wrapTokenCallback(quote, {
            onRequest: liquidityHub.analytics.onWrapRequest,
            onSuccess: liquidityHub.analytics.onWrapSuccess,
            onFailure: liquidityHub.analytics.onWrapFailure,
          })
        }

        // If an appropriate allowance for inToken has not been approved
        // then get user to approve
        if (steps.includes(SwapSteps.Approve)) {
          setCurrentStep(SwapSteps.Approve)
          await approveCallback(quote.user, quote.inToken, {
            onRequest: liquidityHub.analytics.onApprovalRequest,
            onSuccess: liquidityHub.analytics.onApprovalSuccess,
            onFailure: liquidityHub.analytics.onApprovalFailed,
          })
        }

        // Fetch the latest quote again after the approval
        const latestQuote = await getQuote()
        onAcceptQuote(latestQuote)

        // Set the current step to swap
        setCurrentStep(SwapSteps.Swap)

        // Sign the transaction for the swap
        const signature = await signTransaction(latestQuote, {
          onRequest: liquidityHub.analytics.onSignatureRequest,
          onSuccess: (signature) =>
            liquidityHub.analytics.onSignatureSuccess(signature || ''),
          onFailure: liquidityHub.analytics.onSignatureFailed,
        })
        setSignature(signature)

        // Pass the liquidity provider txData if possible
        let paraswapTxData: TransactionParams | undefined

        try {
          paraswapTxData = await buildParaswapTxCallback(optimalRate, slippage)
        } catch (error) {
          console.error(error)
        }

        console.log('Swapping...')
        // Call Liquidity Hub sdk swap and wait for transaction hash
        const txHash = await liquidityHub.swap(
          latestQuote,
          signature as string,
          {
            data: paraswapTxData?.data,
            to: paraswapTxData?.to,
          }
        )

        if (!txHash) {
          throw new Error('Swap failed')
        }

        // Fetch the successful transaction details
        await liquidityHub.getTransactionDetails(txHash, latestQuote)

        console.log('Swapped')
        setSwapStatus(SwapStatus.SUCCESS)
        if (onSuccess) onSuccess()
      } catch (error) {
        setSwapStatus(SwapStatus.FAILED)
        if (onFailure) onFailure()

        throw error
      }
    },
  })
}

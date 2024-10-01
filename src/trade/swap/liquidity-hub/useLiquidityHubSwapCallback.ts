import { useMutation } from '@tanstack/react-query'
import { signTypedData, simulateContract, writeContract } from 'wagmi/actions'
import { _TypedDataEncoder } from '@ethersproject/hash'
import { toast } from 'sonner'
import { permit2Address, Quote } from '@orbs-network/liquidity-hub-sdk'
import { SwapStatus } from '@orbs-network/swap-ui'
import { useLiquidityHubSDK } from './useLiquidityHubSDK'
import { SwapSteps } from '@/types'
import { Address } from 'viem'
import {
  wagmiConfig,
  IWETHabi,
  networks,
  waitForConfirmations,
  promiseWithTimeout,
  getSteps,
  getErrorMessage,
  useParaswapBuildTxCallback,
} from '@/lib'
import { OptimalRate, TransactionParams } from '@paraswap/sdk'
import { approveAllowance } from '@/lib/approveAllowance'

// Analytics events are optional for integration but are useful for your business insights
type AnalyticsEvents = {
  onRequest: () => void
  onSuccess: (result?: string) => void
  onFailure: (error: string) => void
}

async function wrapToken(quote: Quote, analyticsEvents: AnalyticsEvents) {
  try {
    console.log('Wrapping token...')
    analyticsEvents.onRequest()
    // Simulate the contract to check if there would be any errors
    const simulatedData = await simulateContract(wagmiConfig, {
      abi: IWETHabi,
      functionName: 'deposit',
      account: quote.user as Address,
      address: networks.poly.wToken.address as Address,
      value: BigInt(quote.inAmount),
    })

    // Perform the deposit contract function
    const txHash = await writeContract(wagmiConfig, simulatedData.request)

    // Check for confirmations for a maximum of 20 seconds
    await waitForConfirmations(txHash, 1, 20)
    console.log('Token wrapped')
    analyticsEvents.onSuccess()

    return txHash
  } catch (error) {
    console.error(error)
    const errorMessage = getErrorMessage(
      error,
      'An error occurred while wrapping your token'
    )
    toast.error(errorMessage)
    analyticsEvents.onFailure(errorMessage)
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
    analyticsEvents.onFailure((error as Error).message)
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

    const errorMessage = getErrorMessage(
      error,
      'An error occurred while getting the signature'
    )
    toast.error(errorMessage)
    analyticsEvents.onFailure(errorMessage)
    throw error
  }
}

export function useLiquidityHubSwapCallback() {
  const liquidityHub = useLiquidityHubSDK()
  const buildParaswapTxCallback = useParaswapBuildTxCallback()

  return useMutation({
    mutationFn: async ({
      inTokenAddress,
      optimalRate,
      slippage,
      getQuote,
      requiresApproval,
      onAcceptQuote,
      setSwapStatus,
      setCurrentStep,
      onSuccess,
      onFailure,
      onSettled,
      setSignature,
    }: {
      inTokenAddress: string
      slippage: number
      optimalRate: OptimalRate
      getQuote: () => Promise<Quote>
      requiresApproval: boolean
      onAcceptQuote: (quote: Quote) => void
      setSwapStatus: (status?: SwapStatus) => void
      setCurrentStep: (step: SwapSteps) => void
      setSignature: (signature: string) => void
      onSuccess?: () => void
      onFailure?: () => void
      onSettled?: () => void
    }) => {
      // Fetch latest quote just before swap
      const quote = await getQuote()
      // Set swap status for UI
      setSwapStatus(SwapStatus.LOADING)

      // Get the steps required for swap e.g. [Wrap, Approve, Swap]
      const steps = getSteps({
        inTokenAddress,
        requiresApproval,
        liquidityProvider: 'liquidityhub',
      })

      // If the inToken needs to be wrapped then wrap
      if (steps.includes(SwapSteps.Wrap)) {
        setCurrentStep(SwapSteps.Wrap)
        await wrapToken(quote, {
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
      // pass the liquidity provider txData if possible
      let paraswapTxData: TransactionParams | undefined

      try {
        paraswapTxData = await buildParaswapTxCallback(optimalRate, slippage)
      } catch (error) {
        console.error(error)
      }

      try {
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
        console.error(error)
        setSwapStatus(SwapStatus.FAILED)

        const errorMessage = getErrorMessage(
          error,
          'An error occurred while swapping your tokens'
        )
        toast.error(errorMessage)
        if (onFailure) {
          onFailure()
          throw error
        }
      }

      if (onSettled) onSettled()
    },
  })
}
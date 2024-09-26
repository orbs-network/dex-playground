import { useMutation } from '@tanstack/react-query'
import { signTypedData, simulateContract, writeContract } from 'wagmi/actions'
import { _TypedDataEncoder } from '@ethersproject/hash'
import { toast } from 'sonner'
import { permit2Address, Quote } from '@orbs-network/liquidity-hub-sdk'
import { SwapStatus } from '@orbs-network/swap-ui'
import { useLiquidityHubSDK } from './useLiquidityHubSDK'
import { SwapSteps } from '@/types'

import { Address, erc20Abi, maxUint256 } from 'viem'
import {
  wagmiConfig,
  IWETHabi,
  networks,
  waitForConfirmations,
  isNativeAddress,
  promiseWithTimeout,
  getSteps,
} from '@/lib'

async function wrapToken(quote: Quote) {
  try {
    console.log('Wrapping token...')
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

    return txHash
  } catch (error) {
    console.error(error)

    const err = error as Error
    toast.error(
      'message' in err
        ? err.message.length > 100
          ? `${err.message.slice(0, 100)}...`
          : err.message
        : 'An error occurred while wrapping your token'
    )
    throw error
  }
}

async function approveAllowance(account: string, inToken: string) {
  try {
    console.log('Approving allowance...')
    // Simulate the contract to check if there would be any errors
    const simulatedData = await simulateContract(wagmiConfig, {
      abi: erc20Abi,
      functionName: 'approve',
      args: [permit2Address, maxUint256],
      account: account as Address,
      address: (isNativeAddress(inToken)
        ? networks.poly.wToken.address
        : inToken) as Address,
    })

    // Perform the approve contract function
    const txHash = await writeContract(wagmiConfig, simulatedData.request)
    console.log('Approved allowance')

    // Check for confirmations for a maximum of 20 seconds
    await waitForConfirmations(txHash, 1, 20)

    return txHash
  } catch (error) {
    console.error(error)

    const err = error as Error
    toast.error(
      'message' in err
        ? err.message.length > 100
          ? `${err.message.slice(0, 100)}...`
          : err.message
        : 'An error occurred while wrapping your token'
    )
  }
}

async function signTransaction(quote: Quote) {
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

    // Sign transaction and get signature
    const signature = await promiseWithTimeout(
      signTypedData(wagmiConfig, payload),
      40_000
    )

    console.log('Transaction signed')

    return signature
  } catch (error) {
    console.error(error)

    const err = error as Error
    toast.error(
      'message' in err
        ? err.message.length > 100
          ? `${err.message.slice(0, 100)}...`
          : err.message
        : 'An error occurred while getting the signature'
    )
  }
}

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
      onSuccess,
      onFailure,
      onSettled,
    }: {
      inTokenAddress: string
      getQuote: () => Promise<Quote>
      requiresApproval: boolean
      onAcceptQuote: (quote: Quote) => void
      setSwapStatus: (status?: SwapStatus) => void
      setCurrentStep: (step: SwapSteps) => void
      onSuccess?: () => void
      onFailure?: () => void
      onSettled?: () => void
    }) => {
      // Fetch latest quote just before swap
      const quote = await getQuote()

      // Set swap status for UI
      setSwapStatus(SwapStatus.LOADING)

      // Get the steps required for swap e.g. [Wrap, Approve, Swap]
      const steps = getSteps({ inTokenAddress, requiresApproval })

      // If the inToken needs to be wrapped then wrap
      if (steps.includes(SwapSteps.Wrap)) {
        setCurrentStep(SwapSteps.Wrap)
        await wrapToken(quote)
      }

      // If an appropriate allowance for inToken has not been approved
      // then get user to approve
      if (steps.includes(SwapSteps.Approve)) {
        setCurrentStep(SwapSteps.Approve)
        await approveAllowance(quote.user, quote.inToken)
      }

      // Fetch the latest quote again after the approval
      const latestQuote = await getQuote()
      onAcceptQuote(latestQuote)

      // Set the current step to swap
      setCurrentStep(SwapSteps.Swap)

      // Sign the transaction for the swap
      const signature = await signTransaction(latestQuote)

      try {
        console.log('Swapping...')
        // Call Liquidity Hub sdk swap and wait for transaction hash
        const txHash = await liquidityHub.swap(latestQuote, signature as string)

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
        const err = error as Error
        toast.error(
          'message' in err
            ? err.message.length > 100
              ? `${err.message.slice(0, 100)}...`
              : err.message
            : 'An error occurred while swapping your token'
        )
        if (onFailure) onFailure()
      }

      if (onSettled) onSettled()
    },
  })
}

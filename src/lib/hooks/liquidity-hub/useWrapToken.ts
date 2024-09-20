import { IWETHabi } from '@/lib/abis'
import { networks } from '@/lib/networks'
import { wagmiConfig } from '@/lib/wagmi-config'
import {
  SwapStepId,
  SwapStepStatus,
  useSwapStore,
} from '@/trade/liquidity-hub/useSwapStore'
import { Token } from '@/types'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Address } from 'viem'
import {
  getTransactionConfirmations,
  simulateContract,
  writeContract,
} from 'wagmi/actions'

type UseWrapTokenProps = {
  account: string
  srcAmount: bigint
  srcToken: Token | null
}

export function useWrapToken({
  srcAmount,
  account,
  srcToken,
}: UseWrapTokenProps) {
  const updateStatus = useSwapStore((state) => state.updateStatus)
  const appendStep = useSwapStore((state) => state.appendCurrentStep)

  return useMutation({
    mutationKey: [
      'useWrapToken',
      srcToken?.address,
      srcAmount.toString(),
      account,
    ],
    mutationFn: async () => {
      console.log('wrapToken')
      try {
        updateStatus(SwapStepId.Wrap, SwapStepStatus.Loading)

        // Simulate the contract to check if there would be any errors
        const simulatedData = await simulateContract(wagmiConfig, {
          abi: IWETHabi,
          functionName: 'deposit',
          account: account as Address,
          address: networks.poly.wToken.address as Address,
          value: srcAmount,
        })

        const txHash = await writeContract(wagmiConfig, simulatedData.request)
        console.log('wrapToken', txHash)

        const pollConfirmations = setInterval(async () => {
          const confirmations = await getTransactionConfirmations(wagmiConfig, {
            hash: txHash,
          })

          if (confirmations >= 1) {
            clearInterval(pollConfirmations)
            updateStatus(SwapStepId.Wrap, SwapStepStatus.Complete)
            appendStep()
          }
        }, 1000)

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
        updateStatus(SwapStepId.Wrap, SwapStepStatus.Error)
      }
    },
  })
}

import { wagmiConfig } from '@/lib/wagmi-config'
import {
  SwapStepId,
  SwapStepStatus,
  useSwapStore,
} from '@/trade/liquidity-hub/useSwapStore'
import { Token } from '@/types'
import { permit2Address } from '@orbs-network/liquidity-hub-sdk'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Address, erc20Abi, maxUint256 } from 'viem'
import {
  getTransactionConfirmations,
  simulateContract,
  writeContract,
} from 'wagmi/actions'

type UseApproveAllowanceProps = {
  account: string
  srcToken: Token | null
}

export function useApproveAllowance({
  account,
  srcToken,
}: UseApproveAllowanceProps) {
  const updateStatus = useSwapStore((state) => state.updateStatus)
  const appendStep = useSwapStore((state) => state.appendCurrentStep)

  return useMutation({
    mutationKey: ['useApproveAllowance', srcToken?.address, account],
    mutationFn: async () => {
      console.log('approve allowance')
      try {
        updateStatus(SwapStepId.Approve, SwapStepStatus.Loading)

        // Simulate the contract to check if there would be any errors
        const simulatedData = await simulateContract(wagmiConfig, {
          abi: erc20Abi,
          functionName: 'approve',
          args: [permit2Address, maxUint256],
          account: account as Address,
          address: srcToken?.address as Address,
        })

        const txHash = await writeContract(wagmiConfig, simulatedData.request)
        console.log('approve', txHash)

        const pollConfirmations = setInterval(async () => {
          const confirmations = await getTransactionConfirmations(wagmiConfig, {
            hash: txHash,
          })

          if (confirmations >= 3) {
            clearInterval(pollConfirmations)
            updateStatus(SwapStepId.Approve, SwapStepStatus.Complete)
            appendStep()
          }
        }, 3000)

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
        updateStatus(SwapStepId.Approve, SwapStepStatus.Error)
      }
    },
  })
}

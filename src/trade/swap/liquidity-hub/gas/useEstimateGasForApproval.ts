import { wagmiConfig } from '@/lib/wagmi-config'
import { permit2Address } from '@orbs-network/liquidity-hub-sdk'
import { useQuery } from '@tanstack/react-query'
import { Address, encodeFunctionData, erc20Abi, maxUint256 } from 'viem'
import { estimateGas, simulateContract } from 'wagmi/actions'

type UseEstimateGasForWrapToken = {
  account: string
  enabled?: boolean
}

export function useEstimateGasForApproval({
  account,
  enabled,
}: UseEstimateGasForWrapToken) {
  return useQuery({
    queryKey: ['useEstimateGasForApproval', account],
    queryFn: async () => {
      const approveData = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [permit2Address, maxUint256],
      })

      const estimatedGas = await estimateGas(wagmiConfig, {
        account: account as Address,
        to: permit2Address,
        value: maxUint256,
        data: approveData,
      })

      const simulatedData = await simulateContract(wagmiConfig, {
        abi: erc20Abi,
        functionName: 'approve',
        account: account as Address,
        address: permit2Address,
        args: [permit2Address, maxUint256],
      })

      return {
        estimatedGas,
        simulatedData,
      }
    },
    enabled: Boolean(maxUint256 && enabled),
  })
}

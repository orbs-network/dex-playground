import { networks } from '@/lib/networks'
import { wagmiConfig } from '@/lib/wagmi-config'
import { useQuery } from '@tanstack/react-query'
import { Address, encodeFunctionData, erc20Abi } from 'viem'
import { estimateGas, simulateContract } from 'wagmi/actions'

type UseEstimateGasForWrapToken = {
  account: string
  value: bigint
  enabled?: boolean
}

export function useEstimateGasForApproval({
  account,
  value,
  enabled,
}: UseEstimateGasForWrapToken) {
  return useQuery({
    queryKey: ['useEstimateGasForApproval', account, value.toString()],
    queryFn: async () => {
      const approveData = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [account as Address, value],
      })

      const estimatedGas = await estimateGas(wagmiConfig, {
        account: account as Address,
        to: networks.poly.wToken.address as Address,
        value,
        data: approveData,
      })

      const simulatedData = await simulateContract(wagmiConfig, {
        abi: erc20Abi,
        functionName: 'approve',
        account: account as Address,
        address: networks.poly.wToken.address as Address,
        args: [account as Address, value],
      })

      return {
        estimatedGas,
        simulatedData,
      }
    },
    enabled: Boolean(value && enabled),
  })
}

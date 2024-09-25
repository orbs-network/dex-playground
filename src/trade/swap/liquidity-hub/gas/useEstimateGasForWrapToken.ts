import { IWETHabi } from '@/lib/abis'
import { networks } from '@/lib/networks'
import { wagmiConfig } from '@/lib/wagmi-config'
import { useQuery } from '@tanstack/react-query'
import { Address, encodeFunctionData } from 'viem'
import { estimateGas, simulateContract } from 'wagmi/actions'

type UseEstimateGasForWrapToken = {
  account: string
  value: bigint
  enabled?: boolean
}

export function useEstimateGasForWrapToken({
  account,
  value,
  enabled,
}: UseEstimateGasForWrapToken) {
  return useQuery({
    queryKey: ['useEstimateGasForWrapToken', account, value.toString()],
    queryFn: async () => {
      const depositData = encodeFunctionData({
        abi: IWETHabi,
        functionName: 'deposit',
      })

      const estimatedGas = await estimateGas(wagmiConfig, {
        account: account as Address,
        to: networks.poly.wToken.address as Address,
        value,
        data: depositData,
      })

      const simulatedData = await simulateContract(wagmiConfig, {
        abi: IWETHabi,
        functionName: 'deposit',
        account: account as Address,
        address: networks.poly.wToken.address as Address,
        value,
      })

      return {
        estimatedGas,
        simulatedData,
      }
    },
    enabled: Boolean(value && enabled),
  })
}

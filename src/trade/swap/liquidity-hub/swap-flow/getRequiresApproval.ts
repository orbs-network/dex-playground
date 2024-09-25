import { networks } from '@/lib/networks'
import { isNativeAddress } from '@/lib/utils'
import { wagmiConfig } from '@/lib/wagmi-config'
import { permit2Address, Quote } from '@orbs-network/liquidity-hub-sdk'
import { Address, erc20Abi } from 'viem'
import { useReadContract } from 'wagmi'
import { readContract } from 'wagmi/actions'

export async function getRequiresApproval(quote: Quote) {
  const allowance = await readContract(wagmiConfig, {
    address: (isNativeAddress(quote.inToken)
      ? networks.poly.wToken.address
      : quote.inToken) as Address,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [quote.user as Address, permit2Address],
  })

  return (allowance || 0n) < BigInt(quote.inAmount)
}

export function useGetRequiresApproval(quote?: Quote) {
  const { data: allowance, isLoading } = useReadContract({
    address: (isNativeAddress(quote?.inToken)
      ? networks.poly.wToken.address
      : quote?.inToken) as Address,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [quote?.user as Address, permit2Address],
  })

  return {
    requiresApproval: (allowance || 0n) < BigInt(quote?.inAmount || 0),
    approvalLoading: isLoading,
  }
}

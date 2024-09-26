import { networks } from '@/lib/networks'
import { isNativeAddress } from '@/lib/utils'
import { permit2Address, Quote } from '@orbs-network/liquidity-hub-sdk'
import { Address, erc20Abi } from 'viem'
import { useReadContract } from 'wagmi'

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

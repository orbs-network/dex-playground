import { useAccount, useReadContract } from 'wagmi'
import { isNativeAddress } from './utils'
import { networks } from './networks'
import { Address, erc20Abi } from 'viem'
import { Token } from '@/types'

/* Determines whether user needs tp approve allowance for quoted token */
export function useGetRequiresApproval(
  contractAddress: Address,
  inToken?: Token | null,
  inAmount = ''
) {
  const account = useAccount().address
  const { data: allowance, isLoading } = useReadContract({
    address: (isNativeAddress(inToken?.address || '')
      ? networks.poly.wToken.address
      : inToken?.address) as Address,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [account as Address, contractAddress],
  })

  return {
    requiresApproval: (allowance || 0n) < BigInt(inAmount || 0),
    approvalLoading: isLoading,
  }
}

import { useAccount, useReadContract } from 'wagmi'
import { Address, erc20Abi } from 'viem'

/* Determines whether user needs tp approve allowance for quoted token */
export function useGetRequiresApproval(
  contractAddress?: any,
  inTokenAddress = '',
  inAmount = ''
) {
  const { address } = useAccount()
  const {
    data: allowance,
    isLoading,
    error,
  } = useReadContract({
    address: inTokenAddress as Address,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [address as Address, contractAddress],
    query: { enabled: Boolean(inTokenAddress && address && contractAddress) },
  })

  return {
    requiresApproval: (allowance || 0n) < BigInt(inAmount || 0),
    approvalLoading: isLoading,
    error,
  }
}

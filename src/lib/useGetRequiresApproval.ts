import { useAccount, useReadContract } from 'wagmi'
import { Address, erc20Abi } from 'viem'

/* Determines whether user needs tp approve allowance for quoted token */
export function useGetRequiresApproval(
  contractAddress: Address,
  inTokenAddress = '',
  inAmount = ''
) {
  const account = useAccount().address
  const {
    data: allowance,
    isLoading,
    error,
  } = useReadContract({
    address: inTokenAddress as Address,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [account as Address, contractAddress],
    query: { enabled: Boolean(inTokenAddress && account && contractAddress) },
  })

  return {
    requiresApproval: (allowance || 0n) < BigInt(inAmount || 0),
    approvalLoading: isLoading,
    error,
  }
}

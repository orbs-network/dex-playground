import { readContract } from 'wagmi/actions'
import { wagmiConfig } from './wagmi-config'
import { Address, erc20Abi } from 'viem'

export async function getRequiresApproval(
  contractAddress: string,
  inTokenAddress = '',
  inAmount = '',
  account: string
) {
  const allowance = await readContract(wagmiConfig, {
    address: inTokenAddress as Address,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [account as Address, contractAddress as Address],
  })

  return {
    requiresApproval: (allowance || 0n) < BigInt(inAmount || 0),
  }
}
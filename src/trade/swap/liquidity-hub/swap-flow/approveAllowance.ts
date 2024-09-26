import { networks } from '@/lib/networks'
import { isNativeAddress } from '@/lib/utils'
import { wagmiConfig } from '@/lib/wagmi-config'
import { permit2Address } from '@orbs-network/liquidity-hub-sdk'
import { toast } from 'sonner'
import { Address, erc20Abi, maxUint256 } from 'viem'
import { simulateContract, writeContract } from 'wagmi/actions'
import { waitForConfirmations } from './utils'

export async function approveAllowance(account: string, inToken: string) {
  try {
    // Simulate the contract to check if there would be any errors
    const simulatedData = await simulateContract(wagmiConfig, {
      abi: erc20Abi,
      functionName: 'approve',
      args: [permit2Address, maxUint256],
      account: account as Address,
      address: (isNativeAddress(inToken)
        ? networks.poly.wToken.address
        : inToken) as Address,
    })

    // Perform the approve contract function
    const txHash = await writeContract(wagmiConfig, simulatedData.request)
    console.log('approve', txHash)

    // Check for confirmations for a maximum of 20 seconds
    await waitForConfirmations(txHash, 1, 20)

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
  }
}

import { networks } from './networks'
import { getErrorMessage, isNativeAddress, waitForConfirmations } from './utils'
import { wagmiConfig } from './wagmi-config'
import { Address, erc20Abi, maxUint256 } from 'viem'
import { toast } from 'sonner'
import { simulateContract, writeContract } from 'wagmi/actions'

export async function approveAllowance(
  account: string,
  inToken: string,
  contract: Address
) {
  // Simulate the contract to check if there would be any errors
  try {
    console.log('Approving allowance...')

    const simulatedData = await simulateContract(wagmiConfig, {
      abi: erc20Abi,
      functionName: 'approve',
      args: [contract, maxUint256],
      account: account as Address,
      address: (isNativeAddress(inToken)
        ? networks.poly.wToken.address
        : inToken) as Address,
    })

    // Perform the approve contract function
    const txHash = await writeContract(wagmiConfig, simulatedData.request)

    // Check for confirmations for a maximum of 20 seconds
    await waitForConfirmations(txHash, 1, 20)
    console.log('Approved allowance')

    return txHash
  } catch (error) {
    const errorMessage = getErrorMessage(
      error,
      'An error occurred while approving your allowance'
    )
    toast.error(errorMessage)
    throw new Error(errorMessage)
  }
}

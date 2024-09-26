import { IWETHabi } from '@/lib/abis'
import { networks } from '@/lib/networks'
import { wagmiConfig } from '@/lib/wagmi-config'
import { toast } from 'sonner'
import { Address } from 'viem'
import { simulateContract, writeContract } from 'wagmi/actions'
import { Quote } from '@orbs-network/liquidity-hub-sdk'
import { waitForConfirmations } from './utils'

export async function wrapToken(quote: Quote) {
  try {
    // Simulate the contract to check if there would be any errors
    const simulatedData = await simulateContract(wagmiConfig, {
      abi: IWETHabi,
      functionName: 'deposit',
      account: quote.user as Address,
      address: networks.poly.wToken.address as Address,
      value: BigInt(quote.inAmount),
    })

    // Perform the deposit contract function
    const txHash = await writeContract(wagmiConfig, simulatedData.request)

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
    throw error
  }
}

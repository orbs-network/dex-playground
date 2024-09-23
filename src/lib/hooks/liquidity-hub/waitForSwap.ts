import { networks } from '@/lib/networks'
import { getTxDetails, Quote, swap } from '@orbs-network/liquidity-hub-sdk'

type WaitForSwapProps = {
  quote: Quote | null
  signature: string | null
}

export async function waitForSwap({ quote, signature }: WaitForSwapProps) {
  if (!signature || !quote) return

  const txHash = await swap(quote, signature, networks.poly.id)

  if (!txHash) {
    throw new Error('Swap failed')
  }

  return await getTxDetails(txHash, networks.poly.id, quote)
}

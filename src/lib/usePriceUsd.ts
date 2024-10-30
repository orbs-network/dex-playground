import { networks, isNativeAddress } from '@/lib'
import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'

export const usePriceUsd = (address?: string) => {
  const {chainId} = useAccount()
  return useQuery<number>({
    queryKey: ['usePriceUSD', chainId, address],
    queryFn: async () => {
      if (!address || !chainId) {
        return 0
      }

      return (await fetchLLMAPrice(address, chainId)).priceUsd
    },
    refetchInterval: 10_000,
    enabled: !!address && !!chainId,
  })
}

const chainIdToName: { [key: number]: string } = {
  56: 'bsc',
  137: 'polygon',
  8453: 'base', // Assuming this ID is another identifier for Polygon as per the user's mapping
  250: 'fantom',
  1: 'ethereum',
  1101: 'zkevm',
  81457: 'blast',
  59144: 'linea',
  42161: 'arbitrum',
}

export async function fetchLLMAPrice(token: string, chainId: number) {
  const nullPrice = {
    priceUsd: 0,
    priceNative: 0,
    timestamp: Date.now(),
  }
  try {
    const chainName = chainIdToName[chainId] || 'Unknown Chain'

    if (isNativeAddress(token)) {
      token = networks.poly.wToken.address
    }
    const tokenAddressWithChainId = `${chainName}:${token}`
    const url = `https://coins.llama.fi/prices/current/${tokenAddressWithChainId}`
    const response = await fetch(url)
    if (!response.ok) {
      return nullPrice
    }
    const data = await response.json()
    const coin = data.coins[tokenAddressWithChainId]
    return {
      priceUsd: coin.price,
      priceNative: coin.price,
      timestamp: Date.now(),
    }
  } catch (error) {
    console.error('Failed to fetch Llama price', error)
    return nullPrice
  }
}

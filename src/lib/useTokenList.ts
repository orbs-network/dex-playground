import { networks } from '@/lib/networks'
import { Token } from '@/types'
import { zeroAddress } from '@orbs-network/liquidity-hub-sdk'
import { useQuery } from '@tanstack/react-query'

type PolygonToken = {
  address: string
  chainId: number
  decimals: number
  logoURI: string
  name?: string
  symbol: string
}

const getPolygonTokens = async (): Promise<Token[]> => {
  const res = await fetch(
    'https://unpkg.com/quickswap-default-token-list@1.3.16/build/quickswap-default.tokenlist.json'
  )

  if (!res.ok) {
    throw new Error('Failed to fetch tokens')
  }

  const polyTokens = (await res.json()).tokens as PolygonToken[]

  const tokens = polyTokens.filter((it) => it.chainId === networks.poly.id)

  const candiesAddresses = [
    zeroAddress,
    '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    '0x3A58a54C066FdC0f2D55FC9C89F0415C92eBf3C4',
    '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
    '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    '0xdAb529f40E671A1D4bF91361c21bf9f0C9712ab7',
    '0x614389EaAE0A6821DC49062D56BDA3d9d45Fa2ff',
  ]

  const sorted = tokens.sort((a, b) => {
    const indexA = candiesAddresses.indexOf(a.address)
    const indexB = candiesAddresses.indexOf(b.address)
    return indexB - indexA
  })

  return [
    {
      address: zeroAddress,
      symbol: 'MATIC',
      decimals: 18,
      logoURI: 'https://app.1inch.io/assets/images/network-logos/polygon.svg',
      name: 'MATIC',
    },
    ...sorted,
  ].map((token) => {
    return {
      address: token.address,
      symbol: token.symbol,
      decimals: token.decimals,
      logoUrl: token.logoURI?.replace('/logo_24.png', '/logo_48.png'),
      name: token.name,
    }
  })
}



export function useTokensList() {
  const chainId = networks.poly.id

  return useQuery<Token[]>({
    queryFn: async () => {
      return getPolygonTokens() || []
    },
    queryKey: ['tokens-list', chainId],
    staleTime: Infinity,
  })
}

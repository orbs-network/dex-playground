import { zeroAddress } from 'viem'

export const networks = {
  poly: {
    id: 137,
    name: 'Polygon',
    shortname: 'poly',
    native: {
      address: zeroAddress,
      symbol: 'MATIC',
      decimals: 18,
      logoUrl: 'https://app.1inch.io/assets/images/network-logos/polygon.svg',
    },
    wToken: {
      symbol: 'WMATIC',
      address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
      decimals: 18,
      weth: true,
      logoUrl:
        'https://tokens-data.1inch.io/images/0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270.png',
    },
    publicRpcUrl: 'https://polygon-rpc.com',
    logoUrl: 'https://app.1inch.io/assets/images/network-logos/polygon.svg',
    explorer: 'https://polygonscan.com',
    eip1559: true,
  },
}

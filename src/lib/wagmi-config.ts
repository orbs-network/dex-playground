import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'viem'
import { polygon, mainnet, arbitrum, bsc, fantom, blast, linea, sei, base } from 'viem/chains'

const walletConnectProjectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID

export const wagmiConfig = getDefaultConfig({
  appName: 'DEX Playground',
  projectId: walletConnectProjectId,
  chains: [polygon, mainnet, arbitrum, bsc, fantom, blast, linea, sei, base],
  transports: {
    [mainnet.id]: http(`https://rpcman.orbs.network/rpc?chainId=1&appId=dex-playground`),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [bsc.id]: http(),
    [fantom.id]: http(),
    [blast.id]: http(),
    [linea.id]: http(),
    [sei.id]: http(),
    [base.id]: http(),
  }
})

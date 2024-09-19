import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { polygon } from 'viem/chains'

const walletConnectProjectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID

export const wagmiConfig = getDefaultConfig({
  appName: 'DEX Playground',
  projectId: walletConnectProjectId,
  chains: [polygon],
})

import { App } from './App'
import { ThemeProvider } from './providers/theme-provider'
import '@rainbow-me/rainbowkit/styles.css'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { polygon } from 'wagmi/chains'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { RainbowProvider } from './providers/rainbow-provider'

const walletConnectProjectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID

const config = getDefaultConfig({
  appName: 'DEX Playground',
  projectId: walletConnectProjectId,
  chains: [polygon],
})

const queryClient = new QueryClient()

function Root() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <RainbowProvider>
            <App />
          </RainbowProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default Root

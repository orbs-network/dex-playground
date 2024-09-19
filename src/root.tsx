import { App } from './App'
import { ThemeProvider } from './providers/theme-provider'
import '@rainbow-me/rainbowkit/styles.css'
import { WagmiProvider } from 'wagmi'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { RainbowProvider } from './providers/rainbow-provider'
import { structuralSharing } from '@wagmi/core/query'
import { wagmiConfig } from './lib/wagmi-config'
import { Toaster } from './components/ui/sonner'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      structuralSharing,
    },
  },
})

function Root() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <RainbowProvider>
            <App />
            <Toaster />
          </RainbowProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default Root

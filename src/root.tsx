import { App } from './App';
import { ThemeProvider } from './providers/theme-provider';
import '@rainbow-me/rainbowkit/styles.css';
import { WagmiProvider } from '@privy-io/wagmi' // <-- use Privy’s wagmi adapter
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { RainbowProvider } from './providers/rainbow-provider';
import { structuralSharing } from '@wagmi/core/query';
import { wagmiConfig } from './lib/wagmi-config';
import { Toaster } from './components/ui/sonner';
import { PrivyProvider } from '@privy-io/react-auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      structuralSharing,
    },
  },
});

function Root() {
  return (
    <PrivyProvider
      appId="cme0xafwl01l5l70cahm5p4ln"
      config={{
        // creates an embedded wallet at first login for users who don't have one
        embeddedWallets: { 
          createOnLogin: 'all-users'
         },
        appearance: {
          theme: 'dark',
        },
        // optional polish
      }}
    >
     
        <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
            <RainbowProvider>
              <App />
              <Toaster />
            </RainbowProvider>
          </ThemeProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}

export default Root;

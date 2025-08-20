import { Header } from '@/components/header';
import { Swap } from './trade/swap/swap';
import { Settings } from './trade/settings';
import { useEffect, useMemo } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Toaster } from 'sonner';
import { useConnect } from 'wagmi';
import { Button } from './components/ui/button';

export function App() {

  return (
    <>
      <Header />
      <div className="flex justify-center h-full py-32">
        <div className="max-w-lg w-full px-4">
          <Settings />
          <PrevyButton />
          <Swap />
          <Toaster />
        </div>
      </div>
    </>
  );
}

const PrevyButton = () => {
  const { login, logout, authenticated, user } = usePrivy();
  const { wallets } = useWallets();

  

  const { connectors, connect } = useConnect();

  // Find the RainbowKit connector that corresponds to Privy
  const privyConnector = useMemo(
    () => connectors.find((c) => c.id?.toLowerCase().includes('privy')),
    [connectors]
  );
  useEffect(() => {
    if (!authenticated || !privyConnector) return;
    // Only switch if user has an embedded wallet available
    if(!localStorage.getItem('privy-debug')) return 
    connect({ connector: privyConnector });
  }, [authenticated, wallets, privyConnector, connect]);


  return (
    <>
      {user ? (
        <Button onClick={() => logout()}>Logout</Button>
      ) : (
        <Button onClick={() => login()}>Connect with Prevy</Button>
      )}
    </>
  );
};

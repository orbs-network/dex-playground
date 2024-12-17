import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'viem';
import { polygon, mainnet, arbitrum, bsc, fantom, blast, linea, sei, base } from 'viem/chains';

const walletConnectProjectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID;

const _rpcUrl = localStorage.getItem('rpcUrl');
const rpcUrl = _rpcUrl ? http(_rpcUrl) : http();
export const wagmiConfig = getDefaultConfig({
  pollingInterval: 60_0000,
  appName: 'DEX Playground',
  projectId: walletConnectProjectId,
  chains: [polygon, mainnet, arbitrum, bsc, fantom, blast, linea, sei, base],
  transports: {
    [mainnet.id]: rpcUrl,
    [polygon.id]: rpcUrl,
    [arbitrum.id]: rpcUrl,
    [bsc.id]: rpcUrl,
    [fantom.id]: rpcUrl,
    [blast.id]: rpcUrl,
    [linea.id]: rpcUrl,
    [sei.id]: rpcUrl,
    [base.id]: rpcUrl,
  },
});

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'viem';
import {
  polygon,
  mainnet,
  arbitrum,
  bsc,
  fantom,
  blast,
  linea,
  sei,
  base,
  sonic,
  mantle,
  berachain
} from 'viem/chains';

const walletConnectProjectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID;

const localRpcUrl = localStorage.getItem('rpcUrl');
const getRpcUrl = (chainId: number) => {
  if(!localRpcUrl) { 
    return http();
  }
  if (localRpcUrl.includes('rpcman')) {
    return http(`${localRpcUrl}?chainId=${chainId}&appId=playground`);
  }
  return http(localRpcUrl);
};
export const wagmiConfig = getDefaultConfig({
  pollingInterval: 60_0000,
  appName: 'DEX Playground',
  projectId: walletConnectProjectId,
  chains: [polygon, mainnet, arbitrum, bsc, fantom, blast, linea, sei, base, sonic, mantle, berachain],
  transports: {
    [mainnet.id]: getRpcUrl(mainnet.id),
    [polygon.id]: getRpcUrl(polygon.id),
    [arbitrum.id]: getRpcUrl(arbitrum.id),
    [bsc.id]: getRpcUrl(bsc.id),
    [fantom.id]: getRpcUrl(fantom.id),
    [blast.id]: getRpcUrl(blast.id),
    [linea.id]: getRpcUrl(linea.id),
    [sei.id]: getRpcUrl(sei.id),
    [base.id]: getRpcUrl(base.id),
    [sonic.id]: getRpcUrl(sonic.id),
    [mantle.id]: getRpcUrl(mantle.id),
    [berachain.id]: getRpcUrl(berachain.id),
  },
});

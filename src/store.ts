import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppStore {
  slippage: number;
  setSlippage: (slippage: number) => void;
  isLiquidityHubOnly: boolean;
  setLiquidityHubOnly: (liquidityHubOnly: boolean) => void;
  partner: string;
  setPartner: (partner: string) => void;
  rpcUrl: string | undefined;
  setRpcUrl: (rpcUrl?: string) => void;
}
export const useAppState = create(
  persist<AppStore>(
    (set) => ({
      slippage: 0.5,
      setSlippage: (slippage: number) => set({ slippage }),
      isLiquidityHubOnly: false,
      setLiquidityHubOnly: (isLiquidityHubOnly: boolean) => set({ isLiquidityHubOnly }),
      partner: 'widget',
      setPartner: (partner: string) => set({ partner }),
      rpcUrl: undefined,
      setRpcUrl: (rpcUrl?: string) => set({ rpcUrl }),
    }),
    {
      name: 'main-store',
    }
  )
);


export const usePartner = () => {
  const { partner, setPartner } = useAppState();
  return { partner: partner || 'widget', setPartner };
};
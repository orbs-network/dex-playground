import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppStore {
  slippage: number;
  setSlippage: (slippage: number) => void;
  isLiquidityHubOnly: boolean;
  setLiquidityHubOnly: (liquidityHubOnly: boolean) => void;
}
export const useAppState = create(
  persist<AppStore>(
    (set) => ({
      slippage: 0.5,
      setSlippage: (slippage: number) => set({ slippage }),
      isLiquidityHubOnly: false,
      setLiquidityHubOnly: (isLiquidityHubOnly: boolean) => set({ isLiquidityHubOnly }),
    }),
    {
      name: 'main-store',
    }
  )
);

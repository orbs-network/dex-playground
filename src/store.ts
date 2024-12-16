import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppStore {
  slippage: number;
  setSlippage: (slippage: number) => void;
  forceLiquidityHub: boolean;
  setForceLiquidityHub: (forceLiquidityHub: boolean) => void;
}
export const useAppState = create(
  persist<AppStore>(
    (set) => ({
      slippage: 0.5,
      setSlippage: (slippage: number) => set({ slippage }),
      forceLiquidityHub: false,
      setForceLiquidityHub: (forceLiquidityHub: boolean) => set({ forceLiquidityHub }),
    }),
    {
      name: 'main-store',
    }
  )
);

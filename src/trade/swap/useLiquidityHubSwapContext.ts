import { useContext } from "react";
import { LiquidityHubContext } from "./context";

export const useLiquidityHubSwapContext = () => {
  return useContext(LiquidityHubContext);
};

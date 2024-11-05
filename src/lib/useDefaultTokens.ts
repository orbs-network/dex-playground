import { useNetwork } from "@/trade/hooks";
import { useMemo } from "react";
import { useSortedTokens } from "./useTokens";

export function useDefaultTokens() {
  const tokens = useSortedTokens();
  const wToken = useNetwork()?.wToken.symbol
  
  return useMemo(() => {
    if (!tokens) return;
    
    return {
      inToken: tokens.find((token) => token.symbol.toLowerCase() === "usdc"),
      outToken: tokens.find((token) => token.symbol.toLowerCase() === wToken?.toLowerCase()),
    };
  }, [tokens, wToken]);
}

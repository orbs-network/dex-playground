import { useMemo } from "react";
import { useSortedTokens } from "./useTokens";

export function useDefaultTokens() {
  const tokens = useSortedTokens();

  return useMemo(() => {
    if (!tokens) return;
    return {
      inToken: tokens[0],
      outToken: tokens[1],
    };
  }, [tokens]);
}

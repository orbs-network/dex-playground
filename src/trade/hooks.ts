import { getNetwork, toExactAmount, toRawAmount } from "@/lib";
import { useMemo } from "react";
import { useChainId } from "wagmi";

export const useToExactAmount = (amount?: string, decimals?: number) => {
  return useMemo(() => toExactAmount(amount, decimals), [amount, decimals]);
};

export const useToRawAmount = (amount?: string, decimals?: number) => {
  return useMemo(() => toRawAmount(amount, decimals), [amount, decimals]);
};

export const useNetwork = () => {
  const chainId = useChainId();

  return useMemo(() => {
    if (!chainId) return;
    return getNetwork(chainId);
  }, [chainId]);
};

export const useExplorer = () => {
  const network = useNetwork();

  return network?.explorer;
};

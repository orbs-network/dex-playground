import { getNetwork, toExactAmount, toRawAmount } from "@/lib";
import { Token } from "@/types";
import { useMemo } from "react";
import { Address, erc20Abi } from "viem";
import { useChainId, useReadContracts } from "wagmi";

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

export const useToken = (_address?: string) => {
  const address = _address as Address
  const {data: token} = useReadContracts({
    allowFailure: false,
    contracts: [
      {
        address,
        abi: erc20Abi,
        functionName: "decimals",
      },
      {
        address,
        abi: erc20Abi,
        functionName: "name",
      },
      {
        address,
        abi: erc20Abi,
        functionName: "symbol",
      },
    ],
  });

  return useMemo((): Token | undefined => {
    if (!token || !address) return;
    return {
      symbol: token[2],
      decimals: token[0],
      address,
      name: token[1],
      logoUrl: "",
    };
  }, [token, address]);
};

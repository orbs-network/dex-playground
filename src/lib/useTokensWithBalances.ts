import { useAccount } from "wagmi";
import { useTokensList } from "./useTokenList";
import { useBalances } from "./useBalances";
import { TokensWithBalances } from "@/types";

export function useTokensWithBalances() {
  const { address, chainId } = useAccount();
  const { data: tokens, isLoading: tokensLoading } = useTokensList();
  const {
    query: { data: balances, isLoading: balancesLoading, refetch },
    queryKey,
  } = useBalances({
    chainId,
    tokens: tokens || [],
    account: address,
    enabled: Boolean(tokens && address && chainId),
  });

  return {
    isLoading: tokensLoading || balancesLoading,
    tokensWithBalances: balances as TokensWithBalances,
    queryKey,
    refetch,
  };
}

export const useTokenBalance = (tokenAddress?: string) => {
  const { tokensWithBalances } = useTokensWithBalances();
  return !tokenAddress
    ? ""
    : tokensWithBalances?.[tokenAddress]?.balance.toString();
};

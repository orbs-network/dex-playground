import { useAccount } from "wagmi";
import { useTokensList } from "./useTokenList";
import { useBalances } from "./useBalances";
import { networks } from "@/lib/networks";
import { toAmountUi } from "./utils";
import { Token } from "@/types";
import { useMemo } from "react";
import BN from "bignumber.js";

export function useTokensWithBalances() {
  const account = useAccount();
  const { data: tokens, isLoading: tokensLoading } = useTokensList({
    chainId: networks.poly.id,
  });
  const {
    query: { data: balances, isLoading: balancesLoading },
    queryKey,
  } = useBalances({
    chainId: networks.poly.id,
    tokens: tokens || [],
    account: account.address,
    enabled: Boolean(tokens && account.address),
  });

  return {
    isLoading: tokensLoading || balancesLoading,
    tokensWithBalances: balances,
    queryKey,
  };
}

export const useTokenBalance = (token?: Token | null) => {
  const { tokensWithBalances } = useTokensWithBalances();
  return useMemo(() => {
    if (!token?.address) return 0;

    return BN(toAmountUi(
      tokensWithBalances[token.address].balance,
      token.decimals
    )).toNumber();
  }, [tokensWithBalances, token?.address, token?.decimals]);
};

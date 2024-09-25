import { QuoteArgs } from "@orbs-network/liquidity-hub-sdk";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWrapOrUnwrapOnly } from "./useWrapOrUnwrapOnly";
import { isNativeAddress } from "@/lib/utils";
import { networks } from "@/lib/networks";
import { useLiquidityHubSDK } from "./liquidity-hub-sdk";
import { useAccount } from "wagmi";
import { useCallback, useMemo } from "react";

export const QUOTE_REFETCH_INTERVAL = 20_000;

export function useQuote(args: QuoteArgs) {
  const sdk = useLiquidityHubSDK();
  const queryClient = useQueryClient();
  const { chainId } = useAccount();
  const { isUnwrapOnly, isWrapOnly } = useWrapOrUnwrapOnly(
    args.fromToken,
    args.toToken
  );

  const enabled =
    Boolean(
      chainId &&
        args.fromToken &&
        args.toToken &&
        Number(args.inAmount) > 0 &&
        !isUnwrapOnly &&
        !isWrapOnly
    );

  const queryKey = [
    "quote",
    args.fromToken,
    args.toToken,
    args.inAmount,
    args.slippage,
  ];

  const getQuote = useCallback(
    (signal: AbortSignal) => {
      const payload: QuoteArgs = {
        ...args,
        fromToken: isNativeAddress(args.fromToken)
          ? networks.poly.wToken.address
          : args.fromToken,
      };
      return sdk.getQuote({ ...payload, signal });
    },
    [sdk, args]
  );
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => {
      console.log("fetching quote");
      return getQuote(signal);
    },
    enabled,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    gcTime: 0,
    retry: 2,
    refetchInterval: QUOTE_REFETCH_INTERVAL,
  });

  return useMemo(() => {
    return {
      ...query,
      getLatestQuote: () =>
        queryClient.ensureQueryData({
          queryKey,
          queryFn: ({ signal }) => getQuote(signal),
        }),
    };
  }, [query, queryClient, queryKey, getQuote]);
}

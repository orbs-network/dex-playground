import {
  resolveNativeTokenAddress,
  useWrapOrUnwrapOnly,
  useParaswapQuote,
  useInputError,
  getMinAmountOut,
  useGetRequiresApproval,
  networks,
  isNativeAddress,
} from "@/lib";
import { useAppState } from "@/store";
import { permit2Address } from "@orbs-network/liquidity-hub-sdk";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useMemo, useCallback } from "react";
import { Address } from "viem";
import { useAccount } from "wagmi";
import { useLiquidityHubSwapContext } from "./context";

export const QUOTE_REFETCH_INTERVAL = 20_000;

export const useParaswapMinAmountOut = () => {
  const { slippage } = useAppState();
  const optimalRate = useOptimalRate().data;
  return useMemo(() => {
    return getMinAmountOut(slippage, optimalRate?.destAmount || "0");
  }, [optimalRate?.destAmount, slippage]);
};

export function useLiquidityHubQuote() {
  const queryClient = useQueryClient();
  const { chainId, address: account } = useAccount();
  const { slippage } = useAppState();

  const {
    state: { inToken, outToken, liquidityHubDisabled },
    sdk,
    parsedInputAmount,
  } = useLiquidityHubSwapContext();
  const dexMinAmountOut = useParaswapMinAmountOut();

  const inTokenAddress = resolveNativeTokenAddress(inToken?.address);
  const outTokenAddress = outToken?.address;
  // Check if the swap is wrap or unwrap only
  const { isUnwrapOnly, isWrapOnly } = useWrapOrUnwrapOnly(
    inTokenAddress,
    outTokenAddress
  );

  const enabled = Boolean(
    !liquidityHubDisabled &&
      chainId &&
      inTokenAddress &&
      outTokenAddress &&
      Number(parsedInputAmount) > 0 &&
      !isUnwrapOnly &&
      !isWrapOnly &&
      account
  );

  const queryKey = useMemo(
    () => [
      "quote",
      inTokenAddress,
      outTokenAddress,
      parsedInputAmount,
      slippage,
      dexMinAmountOut,
    ],
    [
      inTokenAddress,
      parsedInputAmount,
      slippage,
      outTokenAddress,
      dexMinAmountOut,
    ]
  );

  const getQuote = useCallback(
    ({ signal }: { signal: AbortSignal }) => {
      if (!inTokenAddress || !outTokenAddress || !parsedInputAmount) {
        return Promise.reject(new Error("Invalid input"));
      }
      return sdk.getQuote({
        fromToken: inTokenAddress,
        toToken: outTokenAddress,
        inAmount: parsedInputAmount,
        dexMinAmountOut,
        account,
        slippage,
        signal,
      });
    },
    [
      sdk,
      inTokenAddress,
      outTokenAddress,
      parsedInputAmount,
      account,
      slippage,
      dexMinAmountOut,
    ]
  );

  const query = useQuery({
    queryKey,
    queryFn: getQuote,
    enabled,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    gcTime: 0,
    retry: 2,
    refetchInterval: QUOTE_REFETCH_INTERVAL,
    placeholderData: (prev) => prev,
  });

  return useMemo(() => {
    return {
      // We return the result of getQuote, plus a function to get
      // the last fetched quote in react-query cache
      ...query,
      getLatestQuote: () =>
        queryClient.ensureQueryData({
          queryKey,
          queryFn: getQuote,
        }),
    };
  }, [query, queryClient, queryKey, getQuote]);
}

export const useOptimalRate = () => {
  const {
    parsedInputAmount,
    state: { inToken, outToken },
  } = useLiquidityHubSwapContext();
  return useParaswapQuote({
    inToken: inToken?.address || "",
    outToken: outToken?.address || "",
    inAmount: parsedInputAmount,
    refetchInterval: QUOTE_REFETCH_INTERVAL,
  });
};

export const useLiquidityHubInputError = () => {
  const {
    state: { inToken, inputAmount },
  } = useLiquidityHubSwapContext();
  
  return useInputError({
    inputAmount,
    inToken,
  });
};

const useNetwork = () => {
  const { chainId } = useAccount();

  return useMemo(() => {
    return Object.values(networks).find((network) => network.id === chainId);
  }, [chainId]);
};

const useNativeOrWrapped = (address?: string) => {
  const callback = useNativeOrWrappedAddressCallback();
  return useMemo(() => callback(address), [address]);
};

const useNativeOrWrappedAddressCallback = () => {
  const network = useNetwork();
  return useCallback(
    (address?: string) => {
      return isNativeAddress(address) ? network?.wToken.address : address;
    },
    [network]
  );
};

export const useLiquidityHubApproval = () => {
  const {
    parsedInputAmount,
    state: { inToken },
  } = useLiquidityHubSwapContext();
  const tokenAddress = useNativeOrWrapped(inToken?.address);
  return useGetRequiresApproval(
    permit2Address,
    tokenAddress,
    parsedInputAmount
  );
};

export const useParaswapApproval = () => {
  const optimalRate = useOptimalRate().data;

  const tokenAddress = useNativeOrWrapped(optimalRate?.srcToken);
  return useGetRequiresApproval(
    optimalRate?.tokenTransferProxy as Address,
    tokenAddress,
    optimalRate?.srcAmount
  );
};

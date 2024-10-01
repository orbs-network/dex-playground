import { useCallback, useMemo } from "react";
import { getMinAmountOut, isNativeAddress } from "@/lib/utils";
import { constructSimpleSDK, OptimalRate, SwapSide } from "@paraswap/sdk";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { estimateGas, simulateContract } from "viem/actions";
import { wagmiConfig } from "./wagmi-config";

/* Gets quote from a common existing liquidity source to compare to Orbs Liquidity Hub */
const PARASWAP_NATIVE_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
export function useParaswap() {
  const { chainId } = useAccount();
  return useMemo(() => {
    const paraswapSDK = constructSimpleSDK({
      fetch: window.fetch,
      chainId: chainId || 1,
      version:'6.2'
    });

    return paraswapSDK;
  }, [chainId]);
}
export const useParaswapQuote = ({
  inToken,
  outToken,
  inAmount,
}: {
  inToken?: string;
  outToken?: string;
  inAmount?: string;
}) => {
  const paraswap = useParaswap();
  const { chainId } = useAccount();

  return useQuery({
    queryKey: ["paraswap-quote", inToken, outToken, inAmount, chainId],
    queryFn: async ({ signal }) => {
      const dexQuote = await paraswap.swap.getRate(
        {
          srcToken: isNativeAddress(inToken!)
            ? PARASWAP_NATIVE_ADDRESS
            : inToken!,
          destToken: isNativeAddress(outToken!)
            ? PARASWAP_NATIVE_ADDRESS
            : outToken!,
          amount: inAmount!,
          side: SwapSide.SELL,
          options: {
            includeDEXS: [
              "quickswap",
              "quickswapv3",
              "quickswapv3.1",
              "quickperps",
            ],
            partner: "quickswapv3",
          },
        },
        signal
      );

      return dexQuote;
    },
    enabled: !!inToken && !!outToken && Number(inAmount) > 0,
    refetchInterval: 30_000,
  });
};

export const useParaswapBuildTxCallback = () => {
  const paraswap = useParaswap();
  const account = useAccount().address as string;
  return useCallback(
    (optimalRate: OptimalRate, slippage: number) => {
      return paraswap.swap.buildTx({
        srcToken: optimalRate.srcToken,
        destToken: optimalRate.destToken,
        srcAmount: optimalRate.srcAmount,
        destAmount: getMinAmountOut(slippage, optimalRate.destAmount)!,
        priceRoute: optimalRate,
        userAddress: account,
        receiver: account,
        // set your partner name here, we use quickswapv3 for example
        partner: "quickswapv3",
      });
    },
    [account, paraswap]
  );
};


export const useParaswapSwapCallback = () => {
  const buildParaswapTxCallback = useParaswapBuildTxCallback();



  return useMutation({
    mutationFn: async ({optimalRate, slippage}:{optimalRate: OptimalRate, slippage: number}) => {
      const txData = await buildParaswapTxCallback(optimalRate, slippage);
      const result = await estimateGas(wagmiConfig, {request: txData })
      console.log(result);

      return undefined
      
    
    }
  })
}
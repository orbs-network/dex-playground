import { isNativeAddress } from "@/lib/utils";
import { constructSimpleSDK, SwapSide } from "@paraswap/sdk";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAccount } from "wagmi";

const PARASWAP_NATIVE_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

export function useParaswap() {
  const { chainId } = useAccount();
  return useMemo(() => {
    const paraswapSDK = constructSimpleSDK({
      fetch: window.fetch,
      chainId: chainId || 1,
    });

    return paraswapSDK;
  }, [chainId]);
}

export const useDexRouter = ({
  srcToken,
  destToken,
  srcAmount,
}: {
  srcToken?: string;
  destToken?: string;
  srcAmount?: string;
}) => {
  const paraswap = useParaswap();
  const { chainId } = useAccount();

  return useQuery({
    queryKey: ["paraswap-quote", srcToken, destToken, srcAmount, chainId],
    queryFn: async ({ signal }) => {
      return await paraswap.swap.getRate(
        {
          srcToken: isNativeAddress(srcToken!)
            ? PARASWAP_NATIVE_ADDRESS
            : srcToken!,
          destToken: isNativeAddress(destToken!)
            ? PARASWAP_NATIVE_ADDRESS
            : destToken!,
          amount: srcAmount!,
          side: SwapSide.SELL,

        },
        signal
      );
    },
    enabled: !!srcToken && !!destToken && Number(srcAmount) > 0,
  });
};

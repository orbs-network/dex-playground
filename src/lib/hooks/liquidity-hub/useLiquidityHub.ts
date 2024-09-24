import { useMemo } from "react";
import { constructSDK } from "@orbs-network/liquidity-hub-sdk";
import { useAccount } from "wagmi";

export const useLiquidityHub = () => {
  const { chainId } = useAccount();

  return useMemo(
    () => constructSDK({ chainId, partner: "widget" }),
    [chainId]
  );
};

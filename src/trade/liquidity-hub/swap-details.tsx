import { DataDetails } from "@/components/ui/data-details";
import { toExactAmount, getLiquidityProviderName, format } from "@/lib";
import { Separator } from "@radix-ui/react-dropdown-menu";
import { useMemo } from "react";
import { useAccount } from "wagmi";
import { useToExactAmount } from "../hooks";
import { useLiquidityHubSwapContext } from "./useLiquidityHubSwapContext";
import { useOptimalRate, useParaswapMinAmountOut } from "./hooks";
import { useIsLiquidityHubTrade } from "./useIsLiquidityHubTrade";

 export function SwapDetails() {
    const isLiquidityHubTrade = useIsLiquidityHubTrade();
    const optimalRate = useOptimalRate().data;
    const account = useAccount().address;
    const {
      state: { outToken, inToken },
    } = useLiquidityHubSwapContext();
    const minAmountOut = useParaswapMinAmountOut();
    const inPriceUsd = useMemo(() => {
      if (!optimalRate) return 0;
      const amount = toExactAmount(optimalRate.srcAmount, inToken?.decimals);
      return Number(optimalRate.srcUSD) / Number(amount);
    }, [optimalRate, inToken]);
  
    const minOutAmount = useToExactAmount(minAmountOut, outToken?.decimals);
    const outAmount = useToExactAmount(
      optimalRate?.destAmount,
      outToken?.decimals
    );
  
    const outPriceUsd = useMemo(() => {
      if (!optimalRate) return 0;
      const amount = toExactAmount(optimalRate.destAmount, outToken?.decimals);
      return Number(optimalRate.destUSD) / Number(amount);
    }, [optimalRate, outToken]);
  
    if (!inToken || !outToken || !account || !optimalRate) return null;
  
    const rate = inPriceUsd / outPriceUsd;
  
    let data: Record<string, React.ReactNode> = {
      Rate: `1 ${inToken.symbol} ≈ ${format.crypto(rate)} ${outToken.symbol}`,
    };
  
    data = {
      ...data,
      "Est. Received": `${format.crypto(Number(outAmount))} ${outToken.symbol}`,
      "Min. Received": `${format.crypto(Number(minOutAmount))} ${
        outToken.symbol
      }`,
      "Routing source": getLiquidityProviderName(isLiquidityHubTrade),
    };
  
    return (
      <div className="mt-4 flex flex-col gap-4">
        <DataDetails data={data} />
        <Separator />
        <div className="flex items-center justify-between gap-2">
          <div className="text-slate-300 text-sm">Recepient</div>
          <div className="text-slate-300">{format.address(account)}</div>
        </div>
      </div>
    );
  }
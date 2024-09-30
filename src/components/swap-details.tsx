import { DataDetails } from "@/components/ui/data-details";
import { Separator } from "@/components/ui/separator";
import { format, fromBigNumber } from "@/lib";
import { Token } from "@/types";
import { OptimalRate } from "@paraswap/sdk";
import { useMemo } from "react";

export type SwapDetailsProps = {
  dexTrade?: OptimalRate;
  inToken: Token | null;
  outToken: Token | null;
  account?: string;
  minAmountOut?: string;
};

export function SwapDetails({
  inToken,
  outToken,
  account,
  minAmountOut,
  dexTrade,
}: SwapDetailsProps) {
  const inPriceUsd = useMemo(() => {
    if (!dexTrade) return 0;
    const amount = fromBigNumber(dexTrade.srcAmount, inToken?.decimals);
    return Number(dexTrade.srcUSD) / Number(amount);
  }, [dexTrade, inToken]);

  const outPriceUsd = useMemo(() => {
    if (!dexTrade) return 0;
    const amount = fromBigNumber(dexTrade.destAmount, outToken?.decimals);
    return Number(dexTrade.destUSD) / Number(amount);
  }, [dexTrade, outToken]);

  if (!inToken || !outToken || !account || !dexTrade) return null;

  const rate = inPriceUsd / outPriceUsd;

  let data: Record<string, React.ReactNode> = {
    Rate: `1 ${inToken.symbol} ≈ ${format.crypto(rate)} ${outToken.symbol}`,
  };

  const minOutAmount = fromBigNumber(minAmountOut, outToken.decimals);
  const outAmount = fromBigNumber(dexTrade.destAmount, outToken.decimals);
  data = {
    ...data,
    "Est. Received": `${format.crypto(Number(outAmount))} ${outToken.symbol}`,
    "Min. Received": `${format.crypto(minOutAmount)} ${outToken.symbol}`,
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

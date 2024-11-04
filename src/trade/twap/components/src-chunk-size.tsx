import { usePriceUsd } from "@/lib";
import { useToExactAmount } from "@/trade/hooks";
import { useDerivedTwapSwapData } from "../hooks";
import { useTwapContext } from "../context";

export function SrcChunkSize() {
  const { state } = useTwapContext();
  const {
    values: { inToken },
  } = state;
  const { srcChunkAmount } = useDerivedTwapSwapData();
  const usd = usePriceUsd(inToken?.address).data;
  const srcChunkAmountUi = useToExactAmount(
    srcChunkAmount || "0",
    inToken?.decimals
  );
  const amountUsd = Number(usd || 0) * Number(srcChunkAmountUi || 0);

  return (
    <p className="text-[14px]">
      {`${srcChunkAmountUi} ${inToken?.symbol} per trade`}{" "}
      <small>{`($${amountUsd.toLocaleString("us")})`}</small>
    </p>
  );
}


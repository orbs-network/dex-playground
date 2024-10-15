import { fromBigNumberToStr, networks, usePriceUsd } from "@/lib";
import { useDerivedTwapSwapData } from "../hooks";
import { useTwapContext } from "../twap-context";

export function SrcChunkSize() {
  const { state } = useTwapContext();
  const {
    values: { inToken },
  } = state;
  const { srcChunkAmount } = useDerivedTwapSwapData();
  const usd = usePriceUsd(networks.poly.id, inToken?.address).data;
  const srcChunkAmountUi = fromBigNumberToStr(
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


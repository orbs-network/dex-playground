import { Card } from "@/components/ui/card";
import { cn, networks, toAmountUi, usePriceUSD } from "@/lib";
import { Token } from "@/types";
import { NumericFormat } from "react-number-format";

export const Chunks = ({
  chunks,
  onChange,
  srcChunkAmount,
  inToken
}: {
  chunks: number;
  onChange: (chunks: number) => void;
  srcChunkAmount?: string;
    inToken?: Token | null;
}) => {

    const usd = usePriceUSD( networks.poly.id, inToken?.address).data;
    const srcChunkAmountUi = toAmountUi(srcChunkAmount, inToken?.decimals);
    const amountUsd =  Number(usd || 0) * Number(srcChunkAmountUi || 0)
    
  return (
    <div className="flex flex-col gap-2">
        <p>Over</p>
      <Card
        className={cn(
          "bg-slate-50 dark:bg-slate-900 pt-2 pb-2 pl-2 pr-2 flex gap-4 flex-row items-center"
        )}
      >
        <NumericFormat
          className="bg-transparent w-full min-w-0 outline-none"
          value={chunks}
          placeholder="0"
          contentEditable={true}
          decimalScale={5}
          readOnly={false}
          thousandSeparator={true}
          onValueChange={(values, sourceInfo) => {
            if (sourceInfo.source !== "event") return;
            onChange(Number(values.value));
          }}
        />
        <p className='text-[14px] mr-2'>Orders</p>
      </Card>
      <p className='text-[14px]'>{`${srcChunkAmountUi} ${inToken?.symbol} per trade`} <small>{`($${amountUsd.toLocaleString('us')})`}</small></p>
    </div>
  );
};

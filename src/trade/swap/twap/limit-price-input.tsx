import { Token } from "@/types";
import { NumericFormat } from "react-number-format";
import {
  cn,
  format,
  networks,
  usePriceUSD,
  useTokensWithBalances,
} from "@/lib";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TokenSelect } from "@/components/tokens/token-select";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import BN from "bignumber.js";
import { ArrowUpDown } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";

export type Props = {
  inToken?: Token | null;
  outToken?: Token | null;
  customLimitPrice?: string;
  marketPrice?: string;
  setOutToken: (token: Token) => void;
  setInToken: (token: Token) => void;
  onValueChange: (value?: string) => void;
  amountLoading?: boolean;
};

export function LimitPriceInput(props: Props) {
  const tokens = useTokensWithBalances().tokensWithBalances;
  const [percent, setPercent] = useState<number | undefined>(undefined);
  const [inverted, setInverted] = useState(false);
  const inToken = inverted ? props.outToken : props.inToken;
  const outToken = inverted ? props.inToken : props.outToken;

  const selectedToken = inverted ? inToken : outToken;

  const onSelect = useCallback(
    (token: Token) => {
      if (!inverted) {
        props.setOutToken(token);
      } else {
        props.setInToken(token);
      }
    },
    [inverted, props.setInToken, props.setOutToken]
  );

  useEffect(() => {
    props.onValueChange(undefined);
  }, [inToken?.address, outToken?.address]);

  useEffect(() => {
    if (!props.customLimitPrice) {
      setPercent(undefined);
    }
  }, [props.customLimitPrice]);

  const marketPrice = useMemo(() => {
    if (!props.marketPrice || BN(props.marketPrice).isZero()) return;
    return inverted
      ? BN(1).div(props.marketPrice).toFixed(5)
      : props.marketPrice;
  }, [props.marketPrice, inverted]);

  const amount = useMemo(() => {
    if (props.customLimitPrice !== undefined) {
      return props.customLimitPrice;
    }
    return marketPrice;
  }, [props.customLimitPrice, marketPrice]);

  const onInvert = useCallback(() => {
    setInverted((prev) => !prev);
    props.onValueChange(undefined);
  }, [props.onValueChange]);

  const onPercent = useCallback(
    (percent?: number) => {
      setPercent(percent);

      if (percent == null) {
        props.onValueChange(undefined);
        return;
      }

      const p = BN(percent).div(100).plus(1).toNumber();

      const updatedValue = BN(marketPrice || 0)
        .times(p)
        .toString();

      props.onValueChange(updatedValue);
    },
    [marketPrice, props.onValueChange]
  );

  const options = useMemo(() => {
    return [1, 5, 10].map((option) => option * (inverted ? -1 : 1));
  }, [inverted]);
  const usd = usePriceUSD(networks.poly.id, selectedToken?.address).data;
  const amountUsd = Number(amount || 0) * (usd || 0);

  return (
    <Card
      className={cn("bg-slate-50 dark:bg-slate-900 p-4 flex flex-col gap-4")}
    >
      <div className="flex justify-between items-center">
        <div className="flex flex-row gap-1 items-center">
          <h2 className="text-gray-500 dark:text-gray-400"> when 1 </h2>
          <Avatar className="w-5 h-5">
            <AvatarImage src={inToken?.logoUrl} alt={inToken?.symbol} />
          </Avatar>{" "}
          <h2 className="text-gray-500 dark:text-gray-400">
            {" "}
            {inToken?.symbol} is worth
          </h2>
        </div>
        <ArrowUpDown onClick={onInvert} className="w-5 h-5 cursor-pointer" />
      </div>
      <div className="flex justify-between items-center">
        <div className="text-4xl">
          {props.amountLoading ? (
            <Skeleton className="h-10 w-[250px]" />
          ) : (
            <NumericFormat
              className="bg-transparent w-full min-w-0 outline-none"
              value={amount}
              placeholder="0.00"
              thousandSeparator={true}
              onValueChange={(values, sourceInfo) => {
                if (sourceInfo.source !== "event") return;
                props.onValueChange(values.value);
              }}
            />
          )}
        </div>

        {selectedToken && (
          <div className="flex flex-col gap-3">
            <TokenSelect
              selectedToken={selectedToken}
              tokens={tokens}
              onSelectToken={onSelect}
            />
          </div>
        )}
      </div>
      <div className="flex flex-row">
        <div className="text-gray-500 dark:text-gray-400 text-lg">
          {format.dollar(Number(amountUsd))}
        </div>
        <PercentageButtons
          options={options}
          selected={percent}
          onSelect={onPercent}
        />
      </div>
    </Card>
  );
}

const PercentageButtons = ({
  onSelect,
  selected,
  options,
}: {
  onSelect: (value?: number) => void;
  selected?: number;
  options: number[];
}) => {
  return (
    <div className="flex items-center gap-2 ml-auto">
      <ResetButton selected={!selected} onReset={() => onSelect(undefined)} />
      {options.map((option) => {
        return (
          <PercentButton
            onSelect={onSelect}
            key={option}
            selected={selected === option}
            value={option}
          />
        );
      })}
    </div>
  );
};

const PercentButton = ({
  value,
  onSelect,
  selected,
}: {
  value: number;
  onSelect: (value: number) => void;
  selected: boolean;
}) => {
  return (
    <Button
      onClick={() => onSelect(value)}
      size="sm"
      className={`text-xs bg-black pl-3 pr-3 pt-2 pb-2  h-auto ${selected ? "bg-primary" : ""}`}
    >
      {value}%
    </Button>
  );
};

const ResetButton = ({
  onReset,
  selected,
}: {
  onReset: () => void;
  selected: boolean;
}) => {
  return <PercentButton onSelect={onReset} selected={selected} value={0} />;
};

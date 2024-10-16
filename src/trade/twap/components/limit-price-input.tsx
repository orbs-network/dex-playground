import { Token } from "@/types";
import { NumericFormat } from "react-number-format";
import {
  format,
  networks,
  toExactAmount,
  toRawAmount,
  usePriceUsd,
  useTokensWithBalances,
} from "@/lib";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TokenSelect } from "@/components/tokens/token-select";
import { ReactNode, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import BN from "bignumber.js";
import { ArrowUpDown, X } from "lucide-react";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { useTwapContext } from "../twap-context";
import { useMarketPrice, useTradePrice } from "../hooks";

const useMarketPriceUI = () => {
  const marketPrice = useMarketPrice();

  const { outToken, isTradePriceInverted } = useTwapContext().state.values;
  return useMemo(() => {
    if (!marketPrice || BN(marketPrice).isZero()) return;
    let price = marketPrice;
    if (isTradePriceInverted) {
      const one = toRawAmount("1", outToken?.decimals);
      return BN(one).div(marketPrice).toFixed(5);
    }

    return toExactAmount(price, outToken?.decimals, 5);
  }, [marketPrice, outToken, isTradePriceInverted]);
};

const usePriceDiff = () => {
  const marketPrice = useMarketPrice();
  const tradePrice = useTradePrice();
  return useMemo(() => {
    if (!tradePrice || !marketPrice) return;
    return BN(
      BN(tradePrice)
        .dividedBy(marketPrice)
        .minus(1)
        .multipliedBy(100)
        .toFixed(2)
    ).toNumber();
  }, [marketPrice, tradePrice]);
};

const useOnPercentSelect = () => {
  const { values, updateState } = useTwapContext().state;
  const { isTradePriceInverted } = values;
  const marketPriceUI = useMarketPriceUI();

  return useCallback(
    (p: number) => {
      const percent = BN(p).div(100).plus(1).toNumber();
      const updatedValue = BN(marketPriceUI || 0)
        .times(percent)
        .toString();
      updateState({ customTradePrice: updatedValue });
    },
    [isTradePriceInverted, marketPriceUI, updateState]
  );
};

export function LimitPriceInput() {
  const tokens = useTokensWithBalances().tokensWithBalances;
  const {
    state: { values, updateState },
    isMarketOrder,
  } = useTwapContext();
  const { isTradePriceInverted, outToken, inToken, customTradePrice } = values;
  const fromToken = isTradePriceInverted ? outToken : inToken;
  const toToken = isTradePriceInverted ? inToken : outToken;
  const marketPriceUI = useMarketPriceUI();
  const selectedToken = toToken;

  const onInvertTradePrice = useCallback(() => {
    updateState({
      isTradePriceInverted: !isTradePriceInverted,
      customTradePrice: undefined,
    });
  }, [isTradePriceInverted, updateState]);

  const onSelect = useCallback(
    (token: Token) => {
      if (!isTradePriceInverted) {
        updateState({ outToken: token });
      } else {
        updateState({ inToken: token });
      }
    },
    [isTradePriceInverted, updateState]
  );

  const inputValue = useMemo(() => {
    if (customTradePrice !== undefined) {
      return customTradePrice;
    }
    return marketPriceUI;
  }, [customTradePrice, marketPriceUI, isTradePriceInverted]);

  const usd = usePriceUsd(networks.poly.id, selectedToken?.address).data;
  const amountUsd =
    !inputValue || !usd ? "" : BN(inputValue).multipliedBy(usd).toNumber();

  if (isMarketOrder) return null;

  return (
    <Card className="bg-slate-50 dark:bg-slate-900 p-4 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex flex-row gap-1 items-center">
          <h2 className="text-gray-500 dark:text-gray-400"> when 1 </h2>
          <Avatar className="w-5 h-5">
            <AvatarImage src={fromToken?.logoUrl} alt={fromToken?.symbol} />
          </Avatar>{" "}
          <h2 className="text-gray-500 dark:text-gray-400">
            {" "}
            {fromToken?.symbol} is worth
          </h2>
        </div>

        <ArrowUpDown
          onClick={onInvertTradePrice}
          className="w-5 h-5 cursor-pointer"
        />
      </div>
      <div className="flex justify-between items-center">
        <div className="text-4xl">
          {!marketPriceUI ? (
            <Skeleton className="h-10 w-[250px]" />
          ) : (
            <NumericFormat
              className="bg-transparent w-full min-w-0 outline-none"
              value={inputValue}
              placeholder="0.00"
              allowNegative={false}
              thousandSeparator={true}
              onValueChange={(values, sourceInfo) => {
                if (sourceInfo.source !== "event") return;
                updateState({ customTradePrice: values.value });
              }}
            />
          )}
        </div>

        {selectedToken && (
          <div className="flex flex-col gap-3">
            <TokenSelect
              selectedToken={selectedToken}
              tokens={tokens || {}}
              onSelectToken={onSelect}
            />
          </div>
        )}
      </div>
      <div className="flex flex-row">
        <div className="text-gray-500 dark:text-gray-400 text-lg">
          {format.dollar(Number(amountUsd))}
        </div>
        <PercentageButtons />
      </div>
    </Card>
  );
}

const PercentageButtons = () => {
  const { isTradePriceInverted } = useTwapContext().state.values;
  const onSelect = useOnPercentSelect();
  const percent = useMemo(() => {
    return [1, 5, 10].map((it) => it * (isTradePriceInverted ? -1 : 1));
  }, [isTradePriceInverted]);

  return (
    <div className="flex items-center gap-2 ml-auto">
      <ResetButton />
      {percent.map((option) => {
        const prefix = isTradePriceInverted ? "" : "+";
        return (
          <PercentButton
            onSelect={() => onSelect(option)}
            key={option}
          >{`${prefix}${option}%`}</PercentButton>
        );
      })}
    </div>
  );
};

const PercentButton = ({
  children,
  onSelect,
  className = "",
}: {
  children: ReactNode;
  onSelect: () => void;
  className?: string;
}) => {
  return (
    <Button
      onClick={onSelect}
      size="sm"
      className={`text-xs bg-black pl-2 pr-2 pt-0 pb-0  h-7  ${className}`}
    >
      {children}
    </Button>
  );
};

const ResetButton = () => {
  const diff = usePriceDiff();
  const {
    state: { updateState },
  } = useTwapContext();
  const onReset = useCallback(() => {
    updateState({ customTradePrice: undefined });
  }, [updateState]);

  const prefix = (diff || 0) > 0 ? "+" : "";
  return (
    <PercentButton onSelect={() => onReset()}>
      {diff ? (
        <div className="flex flex-row gap-1 h-full items-center">
          {`${prefix}${diff}%`}{" "}
          <div className="h-full bg-slate-900 w-0.5"></div> <X size={14} />{" "}
        </div>
      ) : (
        "0%"
      )}
    </PercentButton>
  );
};

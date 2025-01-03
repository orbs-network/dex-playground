import {
  networks,
  toExactAmount,
  toRawAmount,
  useInputError,
  useParaswapQuote,
  usePriceUsd,
} from "@/lib";
import { useMemo } from "react";
import { useTwapContext } from "./context";
import BN from "bignumber.js";
import { useToExactAmount, useToRawAmount } from "../hooks";
import {
  MAX_FILL_DELAY_DAYS,
  MIN_DURATION_MINUTES,
  MIN_FILL_DELAY_MINUTES,
} from "@orbs-network/twap-sdk";
import { useAccount } from "wagmi";

export const useDerivedTwapSwapData = () => {
  const {
    twapSDK,
    state,
    parsedInputAmount,
    isLimitPanel,
    isMarketOrder,
    currentTime,
  } = useTwapContext();
  const { inToken, outToken, customFillDelay, customChunks, customDuration } =
    state.values;
  const price = useTradePrice();

  const { data: oneSrcTokenUsd } = usePriceUsd(inToken?.address);

  const swapValues = twapSDK.derivedSwapValues({
    srcAmount: parsedInputAmount,
    price,
    oneSrcTokenUsd,
    isLimitPanel,
    srcDecimals: inToken?.decimals,
    destDecimals: outToken?.decimals,
    isMarketOrder,
    customFillDelay,
    customChunks,
    customDuration,
  });

  return {
    ...swapValues,
    deadline: useMemo(
      () => twapSDK.orderDeadline(currentTime, swapValues.duration),
      [currentTime, swapValues.duration]
    ),
  };
};

export const useOptimalRate = () => {
  const { inToken, outToken } = useTwapContext().state.values;
  return useParaswapQuote({
    inToken: inToken?.address || "",
    outToken: outToken?.address || "",
    inAmount: useToRawAmount("1", inToken?.decimals),
  });
};

export const useMarketPrice = () => {
  const chainId = useAccount().chainId;
  const {
    state: {
      values: { outToken },
    },
  } = useTwapContext();
  const rate = useOptimalRate().data?.destAmount;
  if (chainId === networks.sei.id) {
    return toExactAmount("1", outToken?.decimals);
  }
  return rate;
};

export const useTradePrice = () => {
  const { isMarketOrder, state } = useTwapContext();
  const { customTradePrice, isTradePriceInverted, outToken } = state.values;
  const marketPrice = useMarketPrice();
  return useMemo(() => {
    if (isMarketOrder || customTradePrice === undefined) {
      return marketPrice;
    }
    let result = Number(customTradePrice);
    if (isTradePriceInverted) {
      result = 1 / Number(customTradePrice);
    }

    return toRawAmount(result.toString(), outToken?.decimals).toString();
  }, [
    isMarketOrder,
    outToken?.decimals,
    marketPrice,
    customTradePrice,
    isTradePriceInverted,
  ]);
};

export const useInTokenUsd = () => {
  const { inToken, typedAmount } = useTwapContext().state.values;
  const usd = usePriceUsd(inToken?.address).data;

  return !usd || !typedAmount
    ? ""
    : BN(typedAmount).multipliedBy(usd).toString();
};

export const useOutTokenUsd = () => {
  const { destTokenAmount } = useDerivedTwapSwapData();
  const { outToken } = useTwapContext().state.values;
  const usd = usePriceUsd(outToken?.address).data;
  const amount = useToExactAmount(destTokenAmount, outToken?.decimals);

  return !usd || !amount ? "" : BN(amount).multipliedBy(usd).toString();
};

const useFillDelayWarning = () => {
  const { warnings } = useDerivedTwapSwapData();

  return useMemo(() => {
    if (warnings.maxFillDelay) {
      return `Min. trade interval is ${MIN_FILL_DELAY_MINUTES} minutes`;
    }
    if (warnings.minFillDelay) {
      return `Max. trade interval is ${MAX_FILL_DELAY_DAYS} days`;
    }
  }, [warnings.maxFillDelay, warnings.minFillDelay]);
};

export const useMaxDurationWarning = () => {
  const { warnings } = useDerivedTwapSwapData();

  return useMemo(() => {
    if (warnings.minDuration) {
      return `Min. expiry is ${MIN_DURATION_MINUTES} minutes`;
    }
    if (warnings.maxDuration) {
      return "Max. expiry is 30 days";
    }
  }, [warnings.minDuration, warnings.maxDuration]);
};

const useTradeSizeWarning = () => {
  const { warnings } = useDerivedTwapSwapData();
  const { twapSDK } = useTwapContext();
  return useMemo(() => {
    // if (warnings.tradeSize) {
    //   return `Trade size must be at least Z${twapSDK.config.minChunkSizeUsd}`;
    // }
  }, [warnings.tradeSize, twapSDK.config.minChunkSizeUsd]);
};

export const useTwapInputError = () => {
  const {
    state: { values },
  } = useTwapContext();

  const { typedAmount, inToken } = values;

  const inputError = useInputError({ inputAmount: typedAmount, inToken });
  const tradeSizeWarning = useTradeSizeWarning();
  const fillDelayWarning = useFillDelayWarning();
  const maxDurationWarning = useMaxDurationWarning();

  return (
    inputError || tradeSizeWarning || fillDelayWarning || maxDurationWarning
  );
};

export const useInputLabels = () => {
  const { isMarketOrder } = useTwapContext();
  return useMemo(() => {
    if (!isMarketOrder) {
      return {
        inputLabel: "Sell",
        outputLabel: "Buy",
      };
    }
    return {
      inputLabel: "Allocate",
      outputLabel: "To buy",
    };
  }, [isMarketOrder]);
};

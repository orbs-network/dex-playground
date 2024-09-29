import { Spinner } from "@/components/spinner";
import { TokenCard } from "@/components/tokens/token-card";
import { SwitchButton } from "@/components/ui/switch-button";
import { SwapSteps, Token } from "@/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SwapStatus, SwapStep } from "@orbs-network/swap-ui";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import {
  useDefaultTokens,
  useAmounts,
  useGetRequiresApproval,
  useHandleInputError,
  ErrorCodes,
  format,
  toBigNumber,
  useTokensWithBalances,
  useDexTrade,
  getMinAmountOut,
  getSteps,
  usePriceUSD,
  networks,
  toAmountUi,
  useTokenBalance,
  fromAmountUi,
} from "@/lib";
import "../style.css";
import { useQueryClient } from "@tanstack/react-query";
import { SwapDetails } from "@/components/swap-details";
import { SwapConfirmationDialog } from "../swap-confirmation-dialog";
import { Configs, constructSDK, TimeDuration } from "@orbs-network/twap-sdk";
import { useCreateOrder } from "./useCreateOrder";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import BN from "bignumber.js";
import { FillDelay } from "./fill-delay";
import { Chunks } from "./chunks";

import { LimitPriceInput } from "./limit-price-input";

const config = Configs.QuickSwap;

const slippage = 0.5;

export function SwapTwap({ isLimitPanel }: { isLimitPanel?: boolean }) {
  const queryClient = useQueryClient();
  const { tokensWithBalances, isLoading, queryKey } = useTokensWithBalances();
  const [inToken, setInToken] = useState<Token | null>(null);
  const [outToken, setOutToken] = useState<Token | null>(null);
  const [inputAmount, setInputAmount] = useState<string>("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [requiredSteps, setRequiredSteps] = useState<number[] | undefined>(
    undefined
  );
  const [currentStep, setCurrentStep] = useState<SwapSteps | undefined>(
    undefined
  );
  const [swapStatus, setSwapStatus] = useState<SwapStatus | undefined>(
    undefined
  );
  const [swapConfirmOpen, setSwapConfirmOpen] = useState(false);

  const twapSDK = useMemo(() => constructSDK({ config }), []);

  // Get wagmi account
  const account = useAccount();

  // Set Initial Tokens
  const defaultTokens = useDefaultTokens({
    inToken,
    outToken,
    tokensWithBalances,
    setInToken,
    setOutToken,
  });

  // Handle Amount Input Error
  useHandleInputError({
    debouncedInputAmount: inputAmount,
    inToken,
    tokensWithBalances,
    setInputError,
  });

  // Handle Token Switch
  const handleSwitch = useCallback(() => {
    setInToken(outToken);
    setOutToken(inToken);
    setInputAmount("");
  }, [inToken, outToken]);

  // Handle Swap Confirmation Dialog Close
  const onSwapConfirmClose = useCallback(() => {
    setSwapConfirmOpen(false);
    setInputAmount("");
    setInputError(null);
    setCurrentStep(undefined);
    setSwapStatus(undefined);
  }, [queryClient, queryKey]);

  /* --------- Quote ---------- */
  // The entered input amount has to be converted to a big int string
  // to be used for getting quotes
  const inAmountBigIntStr = fromAmountUi(inputAmount, inToken?.decimals);

  const { data: trade, isLoading: tradeLoading } = useDexTrade({
    inToken: inToken?.address || "",
    outToken: outToken?.address || "",
    // we use 1 input token only to get the currect market price
    inAmount: toBigNumber("1", inToken?.decimals),
  });

  const { mutateAsync: createOrder } = useCreateOrder();
  const { requiresApproval, approvalLoading } = useGetRequiresApproval({
    inTokenAddress: inToken?.address,
    inAmount: inAmountBigIntStr,
    contractAddress: config.twapAddress,
  });

  const marketPrice = trade?.destAmount;

  const onCreateOrder = useCallback(async () => {
    if (!inToken || !outToken || !trade) return;
    const requiredSteps = getSteps({
      inTokenAddress: inToken?.address,
      requiresApproval,
    });
    setRequiredSteps(requiredSteps);
    createOrder();
    // create order
  }, [inToken, outToken, trade, requiresApproval]);

  const [customLimitPrice, setCustomLimitPrice] = useState<undefined | string>(
    undefined
  );
  const price = useMemo(() => {
    if (customLimitPrice !== undefined) {
      return fromAmountUi(customLimitPrice, outToken?.decimals);
    }
    return marketPrice;
  }, [customLimitPrice, marketPrice]);

  const outAmount = useMemo(() => {
    if (!price || !inputAmount) return "";
    const result = BN(price).multipliedBy(inputAmount);
    return toAmountUi(result.toString(), outToken?.decimals);
  }, [price, inputAmount, outToken?.decimals]);

  const amounts = useAmounts({
    inToken,
    outToken,
    inAmount: inputAmount,
    outAmount: marketPrice,
  });

  const steps = useSteps(requiredSteps, inToken);
  const { openConnectModal } = useConnectModal();

  const { data: oneSrcTokenUsd } = usePriceUSD(
    networks.poly.id,
    inToken?.address
  );
  const [customFillDelay, setCustomFillDelay] = useState<
    TimeDuration | undefined
  >(undefined);
  const [isMarketOrder, setIsMarketOrder] = useState(false);
  const [customChunks, setCustomChunks] = useState<number | undefined>(
    undefined
  );

  useEffect(() => {
    setIsMarketOrder(false);
  }, [isLimitPanel]);

  const { dstTokenMinAmount, chunks, fillDelay, srcChunkAmount, duration } =
    twapSDK.getSwapValues({
      srcAmount: inAmountBigIntStr,
      limitPrice: "",
      oneSrcTokenUsd,
      isLimitPanel,
      srcDecimals: inToken?.decimals,
      dstDecimals: outToken?.decimals,
      isMarketOrder: true,
      customFillDelay,
      customChunks,
    });

  const inTokenBalance = useTokenBalance(inToken);
  const outTokenBalance = useTokenBalance(outToken);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center mt-28">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 pt-2">
      <LimitPriceInput
        customLimitPrice={customLimitPrice}
        marketPrice={toAmountUi(marketPrice, outToken?.decimals)}
        onValueChange={setCustomLimitPrice}
        inToken={inToken}
        outToken={outToken}
        setOutToken={setOutToken}
        setInToken={setInToken}
      />
      <TokenCard
        label="Sell"
        amount={inputAmount}
        amountUsd={amounts.inAmountUsd}
        balance={inTokenBalance}
        selectedToken={inToken}
        tokens={tokensWithBalances || {}}
        onSelectToken={setInToken}
        onValueChange={setInputAmount}
        inputError={inputError}
      />
      <div className="h-0 relative z-10 flex items-center justify-center">
        <SwitchButton onClick={handleSwitch} />
      </div>
      <TokenCard
        label="Buy"
        amount={outAmount ? format.crypto(Number(outAmount)) : ""}
        amountUsd={amounts.outAmountUsd}
        balance={outTokenBalance}
        selectedToken={outToken}
        tokens={tokensWithBalances || {}}
        onSelectToken={setOutToken}
        isAmountEditable={false}
        amountLoading={tradeLoading}
        prefix={isMarketOrder ? "≈" : ""}
      />
      <FillDelay fillDelay={fillDelay} onChange={setCustomFillDelay} />
      <Chunks
        chunks={chunks}
        onChange={setCustomChunks}
        srcChunkAmount={srcChunkAmount}
        inToken={inToken}
      />
      {account.address && account.isConnected && outToken && inToken ? (
        <>
          <SwapConfirmationDialog
            outAmount={outAmount}
            outAmountUsd={amounts.outAmountUsd}
            outPriceUsd={amounts.outPriceUsd}
            outToken={outToken}
            inToken={inToken}
            inAmount={inputAmount}
            inAmountUsd={amounts.inAmountUsd}
            onClose={onSwapConfirmClose}
            isOpen={swapConfirmOpen}
            confirmSwap={onCreateOrder}
            swapStatus={swapStatus}
            currentStep={currentStep}
            steps={steps}
          />

          <Button
            className="mt-2"
            size="lg"
            onClick={() => setSwapConfirmOpen(true)}
            disabled={Boolean(inputError || approvalLoading)}
          >
            {inputError === ErrorCodes.InsufficientBalance
              ? "Insufficient balance"
              : "Submit order"}
          </Button>
        </>
      ) : (
        <Button className="mt-2" size="lg" onClick={openConnectModal}>
          Connect wallet
        </Button>
      )}
    </div>
  );
}

const useSteps = (requiredSteps?: number[], inToken?: Token | null) => {
  return useMemo((): SwapStep[] => {
    if (!inToken || !requiredSteps) return [];
    return requiredSteps.map((step) => {
      if (step === SwapSteps.Wrap) {
        return {
          id: SwapSteps.Wrap,
          title: `Wrap ${inToken.symbol}`,
          description: `Wrap ${inToken.symbol}`,
          image: inToken?.logoUrl,
        };
      }
      if (step === SwapSteps.Approve) {
        return {
          id: SwapSteps.Approve,
          title: `Approve ${inToken.symbol}`,
          description: `Approve ${inToken.symbol}`,
          image: inToken?.logoUrl,
        };
      }
      return {
        id: SwapSteps.Swap,
        title: `Create order`,
        image: inToken?.logoUrl,
      };
    });
  }, [inToken, requiredSteps]);
};

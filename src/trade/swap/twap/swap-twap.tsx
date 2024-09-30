import { Spinner } from "@/components/spinner";
import { TokenCard } from "@/components/tokens/token-card";
import { SwitchButton } from "@/components/ui/switch-button";
import { SwapSteps, Token } from "@/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SwapFlow, SwapStatus, SwapStep } from "@orbs-network/swap-ui";
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
  getSteps,
  usePriceUSD,
  networks,
  toAmountUi,
  useTokenBalance,
  fromAmountUi,
  millisecondsToText,
  makeElipsisAddress,
} from "@/lib";
import "../style.css";
import { useQueryClient } from "@tanstack/react-query";
import { SwapConfirmationDialog } from "../swap-confirmation-dialog";
import { Configs, constructSDK, TimeDuration } from "@orbs-network/twap-sdk";
import { useCreateOrder } from "./useCreateOrder";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import BN from "bignumber.js";
import { FillDelay } from "./fill-delay";
import { Chunks } from "./chunks";

import { LimitPriceInput } from "./limit-price-input";
import { Card } from "@/components/ui/card";
import { DataDetails } from "@/components/ui/data-details";
import { getSwapValuesPayload } from "@orbs-network/twap-sdk/dist/lib/lib";
import moment from "moment";
import { Switch } from "@/components/ui/switch";
import { LucideFileWarning } from "lucide-react";

const config = Configs.QuickSwap;

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
  const [customFillDelay, setCustomFillDelay] = useState<
    TimeDuration | undefined
  >(undefined);
  const [isMarketOrder, setIsMarketOrder] = useState(false);
  const [customChunks, setCustomChunks] = useState<number | undefined>(
    undefined
  );

  const [currentStep, setCurrentStep] = useState<SwapSteps | undefined>(
    undefined
  );
  const [swapStatus, setSwapStatus] = useState<SwapStatus | undefined>(
    undefined
  );
  const [swapConfirmOpen, setSwapConfirmOpen] = useState(false);
  const [limitInverted, setLimitInverted] = useState(false);

  const twapSDK = useMemo(() => constructSDK({ config }), []);

  // Get wagmi account
  const account = useAccount();

  // Set Initial Tokens
  useDefaultTokens({
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

  const onMarketOrderChange = useCallback((isMarket: boolean) => {
    setIsMarketOrder(isMarket);
    setCustomLimitPrice(undefined);
  }, []);

  useEffect(() => {
    if (isLimitPanel) {
      onMarketOrderChange(false);
    }
  }, [isLimitPanel, onMarketOrderChange]);

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
    if (isMarketOrder || customLimitPrice === undefined) {
      return marketPrice;
    }
    let result = customLimitPrice;
    if (limitInverted) {
      result = BN(1).dividedBy(customLimitPrice).toString();
    }

    return fromAmountUi(result, outToken?.decimals);
  }, [customLimitPrice, marketPrice, limitInverted, isMarketOrder]);

  const outAmount = useMemo(() => {
    if (!price || !inputAmount) return "";

    const result = BN(price).multipliedBy(inputAmount);
    return result.toString();
  }, [price, inputAmount]);

  const amounts = useAmounts({
    inToken,
    outToken,
    inAmount: inputAmount,
    outAmount: outAmount,
  });

  const steps = useSteps(requiredSteps, inToken);
  const { openConnectModal } = useConnectModal();

  const { data: oneSrcTokenUsd } = usePriceUSD(
    networks.poly.id,
    inToken?.address
  );

  useEffect(() => {
    setIsMarketOrder(false);
  }, [isLimitPanel]);

  const swapValues = twapSDK.getSwapValues({
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

  const { fillDelay, chunks, srcChunkAmount } = swapValues;

  const inTokenBalance = useTokenBalance(inToken);
  const outTokenBalance = useTokenBalance(outToken);

  const outAmountUi = toAmountUi(outAmount, outToken?.decimals);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center mt-28">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 pt-2">
      {!isLimitPanel && (
        <Switch
          className="ml-auto"
          isChecked={!isMarketOrder}
          onChange={() => onMarketOrderChange(!isMarketOrder)}
          label={isMarketOrder ? "Market order" : "Limit order"}
        />
      )}
      {!isMarketOrder && (
        <LimitPriceInput
          customLimitPrice={customLimitPrice}
          marketPrice={toAmountUi(marketPrice, outToken?.decimals)}
          onValueChange={setCustomLimitPrice}
          inToken={inToken}
          outToken={outToken}
          setOutToken={setOutToken}
          setInToken={setInToken}
          limitInverted={limitInverted}
          setLimitInverted={setLimitInverted}
        />
      )}
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
        amount={outAmount ? format.crypto(Number(outAmountUi)) : ""}
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
            outToken={outToken}
            inToken={inToken}
            inAmount={inputAmount}
            onClose={onSwapConfirmClose}
            isOpen={swapConfirmOpen}
            confirmSwap={onCreateOrder}
            swapStatus={swapStatus}
            buttonText="Confirm"
            details={
              <Details
                swapValues={swapValues}
                inToken={inToken}
                outToken={outToken}
              />
            }
            title="Create order"
            failedContent={<SwapFlow.Failed />}
            successContent={<SwapFlow.Success explorerUrl="/" />}
            mainContent={
              <SwapFlow.Main
                fromTitle="Sell"
                toTitle="Buy"
                steps={steps}
                inUsd={amounts.inAmountUsd}
                outUsd={amounts.outAmountUsd}
                currentStep={currentStep as number}
              />
            }
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
      {isMarketOrder && <MarketOrderWarning />}
    </div>
  );
}

const Details = ({
  swapValues,
  inToken,
  outToken,
}: {
  swapValues: getSwapValuesPayload;
  inToken?: Token;
  outToken?: Token;
}) => {
  const srcChunksAmount = toAmountUi(
    swapValues.srcChunkAmount,
    inToken?.decimals
  );
  const { address: account } = useAccount();
  return (
    <div>
      <Card className="bg-slate-900 p-4 flex flex-col gap-2">

          <DataDetails
            data={{
              "Individual trade size": `${srcChunksAmount} ${inToken?.symbol}`,
            }}
          />
          <DataDetails
            data={{
              Expiry: `${moment(swapValues.deadline).format("lll")}`,
            }}
          />
          <DataDetails
            data={{
              "No. of trades": swapValues.chunks,
            }}
          />
          <DataDetails
            data={{
              Every: millisecondsToText(
                swapValues.fillDelay.unit * swapValues.fillDelay.value
              ),
            }}
          />
          <DataDetails
            data={{
              Recipient: makeElipsisAddress(account),
            }}
          />

      </Card>
    </div>
  );
};

const MarketOrderWarning = () => {
  return (
    <Card className="bg-slate-900 p-4 flex flex-col gap-2">
      <p className='text-gray-400 text-sm'>
    * Each individual trade in this order will be filled at the current market
      price at the time of execution.
      <a href="https://www.orbs.com/dtwap-and-dlimit-faq/" target="_blank">
        {" "}Learn more
      </a>
    </p>
    </Card>
  );
};

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

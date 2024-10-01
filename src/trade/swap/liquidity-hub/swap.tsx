import { Spinner } from "@/components/spinner";
import { TokenCard } from "@/components/tokens/token-card";
import { SwitchButton } from "@/components/ui/switch-button";
import { SwapSteps, Token } from "@/types";
import { useCallback, useMemo, useState } from "react";
import { SwapFlow, SwapStatus, SwapStep } from "@orbs-network/swap-ui";
import { useAccount } from "wagmi";
import { SwapDetails } from "../../../components/swap-details";
import { SwapConfirmationDialog } from "../swap-confirmation-dialog";
import { useQuote } from "./useQuote";
import { Button } from "@/components/ui/button";
import { useSwap } from "./useLiquidityHubSwapCallback";
import { permit2Address, Quote } from "@orbs-network/liquidity-hub-sdk";
import {
  useDefaultTokens,
  useAmounts,
  useGetRequiresApproval,
  useHandleInputError,
  ErrorCodes,
  format,
  fromBigNumber,
  getQuoteErrorMessage,
  toBigNumber,
  useDebounce,
  useTokensWithBalances,
  useDexTrade,
  getMinAmountOut,
  getSteps,
} from "@/lib";
import "../style.css";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { DataDetails } from "@/components/ui/data-details";

const slippage = 0.5;

export function Swap() {
  const queryClient = useQueryClient();
  const { tokensWithBalances, isLoading, queryKey } = useTokensWithBalances();
  const [inToken, setInToken] = useState<Token | null>(null);
  const [outToken, setOutToken] = useState<Token | null>(null);
  const [inputAmount, setInputAmount] = useState<string>("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [acceptedQuote, setAcceptedQuote] = useState<Quote | undefined>();
  const debouncedInputAmount = useDebounce(inputAmount, 300);
  const [liquidityHubDisabled, setLiquidityHubDisabled] = useState(false);
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
    debouncedInputAmount,
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
    setAcceptedQuote(undefined);
    setInputAmount("");
    setInputError(null);
    setCurrentStep(undefined);
    setSwapStatus(undefined);
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  /* --------- Quote ---------- */
  // The entered input amount has to be converted to a big int string
  // to be used for getting quotes
  const inAmountBigIntStr = useMemo(() => {
    return toBigNumber(debouncedInputAmount, inToken?.decimals);
  }, [debouncedInputAmount, inToken?.decimals]);

  const { data: dexTrade } = useDexTrade({
    inToken: inToken?.address || "",
    outToken: outToken?.address || "",
    inAmount: inAmountBigIntStr,
  });
  const dexMinAmountOut = useMemo(
    () => getMinAmountOut(slippage, dexTrade?.destAmount),
    [dexTrade?.destAmount, slippage]
  );
  // Fetch Liquidity Hub Quote
  const {
    data: _quote,
    isFetching,
    error: quoteError,
    getLatestQuote,
  } = useQuote(
    {
      fromToken: inToken?.address || "",
      toToken: outToken?.address || "",
      inAmount: inAmountBigIntStr,
      slippage,
      account: account.address,
      dexMinAmountOut,
    },
    liquidityHubDisabled
  );
  /* --------- End Quote ---------- */

  const quote = acceptedQuote || _quote;

  // Comparing Liquidity Hub min amount out with dex min amount out
  // this comparison allows the dex to determine whether they should
  // use the Liquidity Hub or their existing router
  /*

  */

  /* --------- Swap ---------- */
  const onAcceptQuote = useCallback((quote?: Quote) => {
    setAcceptedQuote(quote);
  }, []);
  const { mutateAsync: swap } = useSwap();
  const { requiresApproval, approvalLoading } = useGetRequiresApproval({
    inTokenAddress: inToken?.address,
    inAmount: inAmountBigIntStr,
    contractAddress: permit2Address,
  });

  const proceedWithDexSwap = useCallback(() => {
    // Proceed with the dex swap
  }, []);

  const proceedWithLiquidityHubSwap = useCallback(async () => {
    if (!inToken) return;
    try {
      const requiredSteps = getSteps({
        inTokenAddress: inToken.address,
        requiresApproval,
      });
      setRequiredSteps(requiredSteps);
      await swap({
        steps: requiredSteps,
        getQuote: getLatestQuote,
        onAcceptQuote,
        setSwapStatus,
        setCurrentStep,
        onFailure: onSwapConfirmClose,
      });
    } catch (error) {
      // If the liquidity hub swap fails, need to set the flag to prevent further attempts, and proceed with the dex swap
      // stop quotting from liquidity hub
      // start new flow with dex swap
      setLiquidityHubDisabled(true);
      proceedWithDexSwap();
    }
  }, [
    inToken,
    swap,
    getLatestQuote,
    requiresApproval,
    onAcceptQuote,
    onSwapConfirmClose,
    proceedWithDexSwap,
  ]);

  const confirmSwap = useCallback(async () => {
    // choose between liquidity hub and dex swap based on the min amount out
    // this logic is commented out for now, as we are only using the liquidity hub for the example
    // if (!liquidityHubDisabled &&  toBigInt(quote?.minAmountOut || 0) > BigInt(dexMinAmountOut || 0)) {
    //   proceedWithLiquidityHubSwap();
    // } else {
    //   proceedWithDexSwap();
    // }
    proceedWithLiquidityHubSwap();
  }, [proceedWithDexSwap, proceedWithLiquidityHubSwap, quote, dexMinAmountOut]);

  /* --------- End Swap ---------- */

  // Calculate all amounts for display purposes
  const { inAmountUsd, inPriceUsd, outAmount, outAmountUsd, outPriceUsd } =
    useAmounts({
      inToken,
      outToken,
      inAmount: debouncedInputAmount,
      outAmount: quote?.outAmount,
    });

  const steps = useSteps(requiredSteps, inToken);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center mt-28">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 pt-2">
      <TokenCard
        label="Sell"
        amount={inputAmount}
        amountUsd={inAmountUsd}
        balance={fromBigNumber(
          tokensWithBalances &&
            inToken &&
            tokensWithBalances[inToken.address].balance,
          inToken?.decimals
        )}
        selectedToken={inToken || defaultTokens[0]}
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
        amountUsd={outAmountUsd}
        balance={fromBigNumber(
          tokensWithBalances &&
            outToken &&
            tokensWithBalances[outToken.address].balance,
          outToken?.decimals
        )}
        selectedToken={outToken || defaultTokens[1]}
        tokens={tokensWithBalances || {}}
        onSelectToken={setOutToken}
        isAmountEditable={false}
        amountLoading={isFetching}
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
            confirmSwap={confirmSwap}
            swapStatus={swapStatus}
            title='Swap'
            buttonText={`Swap ${inToken?.symbol} for ${outToken?.symbol}`}
            mainContent={
              <SwapFlow.Main
                steps={steps}
                currentStep={currentStep}
                fromTitle="Sell"
                toTitle="Buy"
                inUsd={inAmountUsd}
                outUsd={outAmountUsd}
              />
            }
            details={<Details />}
            failedContent={<SwapFlow.Failed />}
            successContent={<SwapFlow.Success explorerUrl="/" />}
          />

          <Button
            className="mt-2"
            size="lg"
            onClick={() => setSwapConfirmOpen(true)}
            disabled={Boolean(quoteError || inputError || !quote || approvalLoading)}
          >
            {inputError === ErrorCodes.InsufficientBalance
              ? "Insufficient balance"
              : "Swap"}
          </Button>
        </>
      ) : (
        <Button className="mt-2" size="lg" disabled>
          Wallet not connected
        </Button>
      )}
      {quoteError && (
        <div className="text-red-600">
          {getQuoteErrorMessage(quoteError.message)}
        </div>
      )}

      <SwapDetails
        inToken={inToken}
        outAmount={outAmount}
        outToken={outToken}
        minAmountOut={quote?.minAmountOut}
        inPriceUsd={inPriceUsd}
        outPriceUsd={outPriceUsd}
        account={account.address}
      />
    </div>
  );
}


const Details = () => {
  const account = useAccount().address;
  return (
    <>
      <Card className="bg-slate-900">
        <div className="p-4">
          <DataDetails
            data={{
              Network: "Polygon",
            }}
          />
        </div>
      </Card>
      <Card className="bg-slate-900">
        <div className="p-4">
          <DataDetails
            data={{
              Recipient: format.address(account as string),
            }}
          />
        </div>
      </Card>
    </>
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
        title: `Swap ${inToken.symbol}`,
        description: `Swap ${inToken.symbol}`,
        image: inToken?.logoUrl,
        timeout: 40_000,
      };
    });
  }, [inToken, requiredSteps]);
};

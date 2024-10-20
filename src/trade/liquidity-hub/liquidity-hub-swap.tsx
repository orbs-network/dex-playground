import { TokenCard } from "@/components/tokens/token-card";
import { SwitchButton } from "@/components/ui/switch-button";
import { Token } from "@/types";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from "react";
import { useAccount } from "wagmi";
import { SwapDetails } from "../../components/swap-details";
import { Button } from "@/components/ui/button";

import { useMutation } from "@tanstack/react-query";
import { estimateGas, sendTransaction, signTypedData } from "wagmi/actions";
import { _TypedDataEncoder } from "@ethersproject/hash";
import { SwapStatus } from "@orbs-network/swap-ui";
import { SwapSteps } from "@/types";
import { OptimalRate, TransactionParams } from "@paraswap/sdk";
import { approveAllowance } from "@/lib/approveAllowance";
import { getRequiresApproval } from "@/lib/getRequiresApproval";
import { wrapToken } from "@/lib/wrapToken";

import {
  constructSDK,
  permit2Address,
  Quote,
  LiquidityHubSDK,
} from "@orbs-network/liquidity-hub-sdk";
import {
  useDefaultTokens,
  ErrorCodes,
  fromBigNumber,
  useTokensWithBalances,
  getMinAmountOut,
  useParaswapQuote,
  getQuoteErrorMessage,
  fromBigNumberToStr,
  getErrorMessage,
  resolveNativeTokenAddress,
  useWrapOrUnwrapOnly,
  wagmiConfig,
  waitForConfirmations,
  promiseWithTimeout,
  getSteps,
  useParaswapBuildTxCallback,
} from "@/lib";
import "../style.css";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { toast } from "sonner";
import { SettingsIcon } from "lucide-react";
import BN from "bignumber.js";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useInputError } from "../../lib/useHandleInputError";
import { useToRawAmount } from "../hooks";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  SwapConfirmationDialog,
  SwapProgressState,
  useSwapProgress,
} from "../swap-confirmation-dialog";
import { Address } from "viem";

const initialState: State = {
  inToken: null,
  outToken: null,
  inputAmount: "",
  acceptedQuote: undefined,
  liquidityHubDisabled: false,
  slippage: 0.5,
  forceLiquidityHub: false,
  showConfirmation: false,
};

interface State {
  inToken: Token | null;
  outToken: Token | null;
  inputAmount: string;
  acceptedQuote: Quote | undefined;
  liquidityHubDisabled: boolean;
  slippage: number;
  forceLiquidityHub: boolean;
  showConfirmation: boolean;
}

type Action = { type: "UPDATE"; payload: Partial<State> } | { type: "RESET" };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "UPDATE":
      return { ...state, ...action.payload };
    case "RESET":
      return initialState;
    default:
      return state;
  }
};

interface ContextType {
  state: State;
  updateState: (payload: Partial<State>) => void;
  resetState: () => void;
  sdk: LiquidityHubSDK;
  parsedInputAmount?: string;
}

const Context = createContext({} as ContextType);
const useSwapContext = () => {
  return useContext(Context);
};

export const SwapProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { chainId } = useAccount();
  const { tokensWithBalances, refetch: refetchBalances } =
    useTokensWithBalances();
  const parsedInputAmount = useToRawAmount(
    state.inputAmount,
    state.inToken?.decimals
  );

  const updateState = useCallback(
    (payload: Partial<State>) => {
      dispatch({ type: "UPDATE", payload });
    },
    [dispatch]
  );

  const resetState = useCallback(() => {
    dispatch({ type: "RESET" });
    refetchBalances();
  }, [dispatch, refetchBalances]);

  const sdk = useMemo(
    () => constructSDK({ partner: "widget", chainId }),
    [chainId]
  );

  useDefaultTokens({
    inToken: state.inToken,
    outToken: state.outToken,
    tokensWithBalances,
    setInToken: (token) => updateState({ inToken: token }),
    setOutToken: (token) => updateState({ outToken: token }),
  });

  return (
    <Context.Provider
      value={{
        state,
        parsedInputAmount,
        updateState,
        resetState,
        sdk,
      }}
    >
      {children}
    </Context.Provider>
  );
};

export const QUOTE_REFETCH_INTERVAL = 20_000;

// ------------ Fetches quote using Liquidity Hub sdk ------------ //

export function useLiquidityHubQuote(dexMinAmountOut?: string) {
  const queryClient = useQueryClient();
  const { chainId, address: account } = useAccount();
  const {
    state: { inToken, outToken, liquidityHubDisabled, slippage },
    sdk,
    parsedInputAmount,
  } = useSwapContext();
  const inTokenAddress = resolveNativeTokenAddress(inToken?.address);
  const outTokenAddress = outToken?.address;
  // Check if the swap is wrap or unwrap only
  const { isUnwrapOnly, isWrapOnly } = useWrapOrUnwrapOnly(
    inTokenAddress,
    outTokenAddress
  );

  const enabled = Boolean(
    !liquidityHubDisabled &&
      chainId &&
      inTokenAddress &&
      outTokenAddress &&
      Number(parsedInputAmount) > 0 &&
      !isUnwrapOnly &&
      !isWrapOnly
  );

  const queryKey = useMemo(
    () => [
      "quote",
      inTokenAddress,
      outTokenAddress,
      parsedInputAmount,
      slippage,
    ],
    [inTokenAddress, parsedInputAmount, slippage, outTokenAddress]
  );

  const getQuote = useCallback(
    ({ signal }: { signal: AbortSignal }) => {
      if (!inTokenAddress || !outTokenAddress || !parsedInputAmount) {
        return Promise.reject(new Error("Invalid input"));
      }
      return sdk.getQuote({
        fromToken: inTokenAddress,
        toToken: outTokenAddress,
        inAmount: parsedInputAmount,
        dexMinAmountOut,
        account,
        slippage,
        signal,
      });
    },
    [sdk, inTokenAddress, outTokenAddress, parsedInputAmount, account, slippage]
  );

  const query = useQuery({
    queryKey,
    queryFn: getQuote,
    enabled,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    gcTime: 0,
    retry: 2,
    refetchInterval: QUOTE_REFETCH_INTERVAL,
  });

  return useMemo(() => {
    return {
      // We return the result of getQuote, plus a function to get
      // the last fetched quote in react-query cache
      ...query,
      getLatestQuote: () =>
        queryClient.ensureQueryData({
          queryKey,
          queryFn: getQuote,
        }),
    };
  }, [query, queryClient, queryKey, getQuote]);
}

const useOptimalRate = () => {
  const {
    parsedInputAmount,
    state: { inToken, outToken },
  } = useSwapContext();
  return useParaswapQuote({
    inToken: inToken?.address || "",
    outToken: outToken?.address || "",
    inAmount: parsedInputAmount,
  });
};

// ------------ Swap ----------- //

function SwapPanel() {
  const { tokensWithBalances } = useTokensWithBalances();
  const {
    state: {
      inToken,
      outToken,
      inputAmount,
      slippage,
      acceptedQuote,
      forceLiquidityHub,
      liquidityHubDisabled,
    },
    updateState,
    resetState,
    parsedInputAmount,
  } = useSwapContext();

  const inputError = useInputError({
    inputAmount,
    inToken,
  });

  // Handle Token Switch
  const handleSwitch = useCallback(() => {
    updateState({
      inToken: outToken,
      outToken: inToken,
      inputAmount: "",
    });
  }, [inToken, outToken, updateState]);

  // Handle Swap Confirmation Dialog Close
  const onSwapConfirmClose = useCallback(() => {
    resetState();
  }, [resetState]);

  /* --------- Quote ---------- */
  // The entered input amount has to be converted to a big int string
  // to be used for getting quotes

  const { data: optimalRate, isLoading: optimalRateLoading } = useOptimalRate();

  const paraswapMinAmountOut = getMinAmountOut(
    slippage,
    optimalRate?.destAmount || "0"
  );

  // Fetch Liquidity Hub Quote
  const {
    data: _quote,
    getLatestQuote,
    error: quoteError,
  } = useLiquidityHubQuote();

  const liquidityHubQuote = acceptedQuote || _quote;

  /* --------- End Quote ---------- */

  /* --------- Swap ---------- */
  const isLiquidityHubTrade = useMemo(() => {
    // Choose between liquidity hub and dex swap based on the min amount out
    if (
      forceLiquidityHub ||
      (!liquidityHubDisabled &&
        BN(liquidityHubQuote?.minAmountOut || 0).gt(paraswapMinAmountOut || 0))
    ) {
      return true;
    }
    return false;
  }, [
    forceLiquidityHub,
    liquidityHubDisabled,
    liquidityHubQuote?.minAmountOut,
    paraswapMinAmountOut,
  ]);

  const swapWithParaswap = useCallback(async () => {
    if (!optimalRate) return;
    try {
      await paraswapSwapCallback({
        optimalRate,
        slippage,
        setCurrentStep,
        setSwapStatus,
        onFailure: resetSwap,
      });
    } catch (error) {
      console.error(error);
      toast.error(getErrorMessage(error, "An error occurred while swapping"));
    }
  }, [optimalRate, paraswapSwapCallback, resetSwap, slippage]);

  const swapWithLiquidityHub = useCallback(async () => {
    if (!optimalRate) {
      toast.error("An unknown error occurred");
      return;
    }

    try {
      await liquidityHubSwapCallback({
        inTokenAddress: inToken!.address,
        getQuote: getLatestQuote,
        onAcceptQuote,
        setSwapStatus,
        setCurrentStep,
        onFailure: resetSwap,
        setSignature,
        slippage,
        optimalRate,
      });
    } catch (error) {
      // If the liquidity hub swap fails, need to set the flag to prevent further attempts, and proceed with the dex swap
      // stop quoting from liquidity hub
      // start new flow with dex swap
      console.error(error);
      console.log("Liquidity Hub Swap failed, proceeding with ParaSwap...");
      setLiquidityHubDisabled(true);
      swapWithParaswap();
    }
  }, [
    optimalRate,
    liquidityHubSwapCallback,
    inToken,
    getLatestQuote,
    onAcceptQuote,
    resetSwap,
    slippage,
    swapWithParaswap,
  ]);

  const confirmSwap = useCallback(async () => {
    if (isLiquidityHubTrade) {
      console.log("Proceeding with Liquidity Hub");
      swapWithLiquidityHub();
    } else {
      console.log("Proceeding with ParaSwap");
      setLiquidityHubDisabled(true);
      swapWithParaswap();
    }
  }, [isLiquidityHubTrade, swapWithLiquidityHub, swapWithParaswap]);
  /* --------- End Swap ---------- */

  const destAmount = optimalRate?.destAmount
    ? fromBigNumberToStr(optimalRate.destAmount, outToken?.decimals)
    : "";
  const outAmount = useMemo(() => first, [second]);

  const { openConnectModal } = useConnectModal();
  return (
    <div>
      <div className="flex justify-end">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon">
              <SettingsIcon className="w-5 h-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <div className="flex flex-col gap-4">
              <div className="flex gap-4 items-center justify-between">
                <Label htmlFor="slippage">Slippage</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="slippage"
                    type="number"
                    onChange={(e) => setSlippage(e.target.valueAsNumber)}
                    value={slippage}
                    step={0.1}
                    className="text-right w-16 [&::-webkit-inner-spin-button]:appearance-none p-2 h-7"
                  />
                  <div>%</div>
                </div>
              </div>
              <div className="flex gap-4 items-center justify-between">
                <Label htmlFor="force-lh">Force Liquidity Hub</Label>
                <Switch
                  id="force-lh"
                  onCheckedChange={(checked: any) =>
                    setForceLiquidityHub(checked)
                  }
                  checked={forceLiquidityHub}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex flex-col gap-2 pt-2">
        <TokenCard
          label="Sell"
          amount={inputAmount}
          amountUsd={optimalRate?.srcUSD}
          balance={
            (tokensWithBalances &&
              inToken &&
              tokensWithBalances[inToken.address].balance) ||
            0n
          }
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
          amount={destAmount ?? ""}
          amountUsd={optimalRate?.destUSD}
          balance={
            (tokensWithBalances &&
              outToken &&
              tokensWithBalances[outToken.address].balance) ||
            0n
          }
          selectedToken={outToken || defaultTokens[1]}
          tokens={tokensWithBalances || {}}
          onSelectToken={setOutToken}
          isAmountEditable={false}
          amountLoading={optimalRateLoading}
        />
        {account.address && account.isConnected && outToken && inToken ? (
          <>
            <SwapConfirmationDialog
              outToken={outToken}
              inToken={inToken}
              onClose={onSwapConfirmClose}
              isOpen={swapConfirmOpen}
              confirmSwap={confirmSwap}
              swapStatus={swapStatus}
              currentStep={currentStep}
              signature={signature}
              inAmount={fromBigNumber(optimalRate?.srcAmount, inToken.decimals)}
              inAmountUsd={optimalRate?.srcUSD}
              outAmount={
                Number(
                  isLiquidityHubTrade
                    ? fromBigNumberToStr(
                        liquidityHubQuote?.referencePrice || "0",
                        outToken.decimals
                      )
                    : destAmount
                ) || 0
              }
              outAmountUsd={optimalRate?.destUSD}
              allowancePermitAddress={
                !isLiquidityHubTrade && optimalRate
                  ? optimalRate.tokenTransferProxy
                  : permit2Address
              }
            />

            <Button
              className="mt-2"
              size="lg"
              onClick={() => setSwapConfirmOpen(true)}
              disabled={Boolean(
                inputError ||
                  optimalRateLoading ||
                  !liquidityHubQuote ||
                  !optimalRate
              )}
            >
              {inputError === ErrorCodes.InsufficientBalance
                ? "Insufficient balance"
                : inputAmount && !liquidityHubQuote
                ? "Fetching quote..."
                : !optimalRate && inputAmount
                ? "No liquidity"
                : "Swap"}
            </Button>
          </>
        ) : (
          <Button className="mt-2" size="lg" onClick={openConnectModal}>
            Connect wallet
          </Button>
        )}

        {quoteError && (
          <div className="text-red-600">
            {getQuoteErrorMessage(quoteError.message)}
          </div>
        )}

        <SwapDetails
          optimalRate={optimalRate}
          inToken={inToken}
          outToken={outToken}
          minAmountOut={paraswapMinAmountOut}
          account={account.address}
          isLiquidityHubTrade={isLiquidityHubTrade}
        />
      </div>
    </div>
  );
}

export const Swap = () => {
  return (
    <SwapProvider>
      <SwapPanel />
    </SwapProvider>
  );
};

const LiquididyHubConfirmationDialog = () => {
  const {
    state: { showConfirmation, inToken, outToken, inputAmount },
    updateState,
  } = useSwapContext();

  const {
    state: { currentStep, swapStatus },
    updateState: updateSwapProgressState,
  } = useSwapProgress();
  const { mutateAsync: liquidityHubSwapCallback } = useLiquidityHubSwapCallback(
    updateSwapProgressState
  );
  const { mutateAsync: paraswapSwapCallback } = useParaswapSwapCallback();

  const onClose = useCallback(() => {
    updateState({ showConfirmation: false });
  }, [updateState]);

  return (
    <SwapConfirmationDialog
      isOpen={showConfirmation}
      onClose={onClose}
      inToken={inToken}
      outToken={outToken}
      inAmount={Number(inputAmount)}
      outAmount={0}
    />
  );
};

// Analytics events are optional for integration but are useful for your business insights
type AnalyticsEvents = {
  onRequest: () => void;
  onSuccess: (result?: string) => void;
  onFailure: (error: string) => void;
};

async function wrapTokenCallback(
  quote: Quote,
  analyticsEvents: AnalyticsEvents
) {
  try {
    console.log("Wrapping token...");
    analyticsEvents.onRequest();

    // Perform the deposit contract function
    const txHash = await wrapToken(quote.user, quote.inAmount);

    // Check for confirmations for a maximum of 20 seconds
    await waitForConfirmations(txHash, 1, 20);
    console.log("Token wrapped");
    analyticsEvents.onSuccess();

    return txHash;
  } catch (error) {
    analyticsEvents.onFailure(
      getErrorMessage(error, "An error occurred while wrapping your token")
    );
    throw error;
  }
}

async function approveCallback(
  account: string,
  inToken: string,
  analyticsEvents: AnalyticsEvents
) {
  try {
    analyticsEvents.onRequest();
    // Perform the approve contract function
    const txHash = await approveAllowance(account, inToken, permit2Address);

    analyticsEvents.onSuccess(txHash);
    return txHash;
  } catch (error) {
    analyticsEvents.onFailure(
      getErrorMessage(error, "An error occurred while approving the allowance")
    );
    throw error;
  }
}

async function signTransaction(quote: Quote, analyticsEvents: AnalyticsEvents) {
  // Encode the payload to get signature
  const { permitData } = quote;
  const populated = await _TypedDataEncoder.resolveNames(
    permitData.domain,
    permitData.types,
    permitData.values,
    async (name: string) => name
  );
  const payload = _TypedDataEncoder.getPayload(
    populated.domain,
    permitData.types,
    populated.value
  );

  try {
    console.log("Signing transaction...");
    analyticsEvents.onRequest();

    // Sign transaction and get signature
    const signature = await promiseWithTimeout<string>(
      signTypedData(wagmiConfig, payload),
      40_000
    );

    console.log("Transaction signed");
    analyticsEvents.onSuccess(signature);

    return signature;
  } catch (error) {
    console.error(error);

    analyticsEvents.onFailure(
      getErrorMessage(error, "An error occurred while getting the signature")
    );
    throw error;
  }
}

export const useParaswapSwapCallback = (
  updateSwapProgressState: (value: Partial<SwapProgressState>) => void
) => {
  const buildParaswapTxCallback = useParaswapBuildTxCallback();
  const optimalRate = useOptimalRate().data;
  const {
    state: { slippage },
  } = useSwapContext();
  const { address } = useAccount();

  return useMutation({
    mutationFn: async ({
      onSuccess,
      onFailure,
    }: {
      onSuccess?: () => void;
      onFailure?: () => void;
    }) => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      if (!optimalRate) {
        throw new Error("No optimal rate found");
      }

      try {
        updateSwapProgressState({ swapStatus: SwapStatus.LOADING });

        // Check if the inToken needs approval for allowance
        const requiresApproval = await getRequiresApproval(
          optimalRate.tokenTransferProxy,
          resolveNativeTokenAddress(optimalRate.srcToken),
          optimalRate.srcAmount,
          address
        );

        if (requiresApproval) {
          updateSwapProgressState({ currentStep: SwapSteps.Approve });
          await approveAllowance(
            address,
            optimalRate.srcToken,
            optimalRate.tokenTransferProxy as Address
          );
        }

        updateSwapProgressState({ currentStep: SwapSteps.Swap });

        let txPayload: unknown | null = null;

        try {
          const txData = await buildParaswapTxCallback(optimalRate, slippage);

          txPayload = {
            account: txData.from as Address,
            to: txData.to as Address,
            data: txData.data as `0x${string}`,
            gasPrice: BigInt(txData.gasPrice),
            gas: txData.gas ? BigInt(txData.gas) : undefined,
            value: BigInt(txData.value),
          };
        } catch (error) {
          // Handle error in UI
          console.error(error);
          if (onFailure) onFailure();
          updateSwapProgressState({ swapStatus: SwapStatus.FAILED });
        }

        if (!txPayload) {
          if (onFailure) onFailure();
          updateSwapProgressState({ swapStatus: SwapStatus.FAILED });

          throw new Error("Failed to build transaction");
        }

        console.log("Swapping...");

        await estimateGas(wagmiConfig, txPayload);

        const txHash = await sendTransaction(wagmiConfig, txPayload);

        await waitForConfirmations(txHash, 1, 20);

        if (onSuccess) onSuccess();

        updateSwapProgressState({ swapStatus: SwapStatus.SUCCESS });

        return txHash;
      } catch (error) {
        console.error(error);
        if (onFailure) onFailure();
        updateSwapProgressState({ swapStatus: SwapStatus.FAILED });

        throw error;
      }
    },
  });
};

export function useLiquidityHubSwapCallback(
  updateSwapProgressState: (partial: Partial<SwapProgressState>) => void
) {
  const { sdk: liquidityHub, state:{inToken, slippage} } = useSwapContext();
  const buildParaswapTxCallback = useParaswapBuildTxCallback();
  const account = useAccount();
  const optimalRate = useOptimalRate().data;

  const inTokenAddress = inToken?.address


  return useMutation({
    mutationFn: async ({
      getQuote,
      onAcceptQuote,
      setSwapStatus,
      setCurrentStep,
      onSuccess,
      onFailure,
      setSignature,
    }: {
      getQuote: () => Promise<Quote>;
      onAcceptQuote: (quote: Quote) => void;
      setSwapStatus: (status?: SwapStatus) => void;
      setCurrentStep: (step: SwapSteps) => void;
      setSignature: (signature: string) => void;
      onSuccess?: () => void;
      onFailure?: () => void;
    }) => {
      // Fetch latest quote just before swap
      const quote = await getQuote();
      // Set swap status for UI
      setSwapStatus(SwapStatus.LOADING);

      try {
        // Check if the inToken needs approval for allowance
        const requiresApproval = await getRequiresApproval(
          permit2Address,
          resolveNativeTokenAddress(inTokenAddress),
          quote.inAmount,
          account.address as string
        );

        // Get the steps required for swap e.g. [Wrap, Approve, Swap]
        const steps = getSteps({
          inTokenAddress,
          requiresApproval,
        });

        // If the inToken needs to be wrapped then wrap
        if (steps.includes(SwapSteps.Wrap)) {
          setCurrentStep(SwapSteps.Wrap);
          await wrapTokenCallback(quote, {
            onRequest: liquidityHub.analytics.onWrapRequest,
            onSuccess: liquidityHub.analytics.onWrapSuccess,
            onFailure: liquidityHub.analytics.onWrapFailure,
          });
        }

        // If an appropriate allowance for inToken has not been approved
        // then get user to approve
        if (steps.includes(SwapSteps.Approve)) {
          setCurrentStep(SwapSteps.Approve);
          await approveCallback(quote.user, quote.inToken, {
            onRequest: liquidityHub.analytics.onApprovalRequest,
            onSuccess: liquidityHub.analytics.onApprovalSuccess,
            onFailure: liquidityHub.analytics.onApprovalFailed,
          });
        }

        // Fetch the latest quote again after the approval
        const latestQuote = await getQuote();
        onAcceptQuote(latestQuote);

        // Set the current step to swap
        setCurrentStep(SwapSteps.Swap);

        // Sign the transaction for the swap
        const signature = await signTransaction(latestQuote, {
          onRequest: liquidityHub.analytics.onSignatureRequest,
          onSuccess: (signature) =>
            liquidityHub.analytics.onSignatureSuccess(signature || ""),
          onFailure: liquidityHub.analytics.onSignatureFailed,
        });
        setSignature(signature);

        // Pass the liquidity provider txData if possible
        let paraswapTxData: TransactionParams | undefined;

        try {
          paraswapTxData = await buildParaswapTxCallback(optimalRate, slippage);
        } catch (error) {
          console.error(error);
        }

        console.log("Swapping...");
        // Call Liquidity Hub sdk swap and wait for transaction hash
        const txHash = await liquidityHub.swap(
          latestQuote,
          signature as string,
          {
            data: paraswapTxData?.data,
            to: paraswapTxData?.to,
          }
        );

        if (!txHash) {
          throw new Error("Swap failed");
        }

        // Fetch the successful transaction details
        await liquidityHub.getTransactionDetails(txHash, latestQuote);

        console.log("Swapped");
        setSwapStatus(SwapStatus.SUCCESS);
        if (onSuccess) onSuccess();
      } catch (error) {
        setSwapStatus(SwapStatus.FAILED);
        if (onFailure) onFailure();

        throw error;
      }
    },
  });
}

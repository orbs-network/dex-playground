import { Button } from "@/components/ui/button";
import { SwapSteps } from "@/types";
import { Card } from "@/components/ui/card";
import { SwapStep, SwapStatus } from "@orbs-network/swap-ui";
import { useCallback, useMemo } from "react";
import { DataDetails } from "@/components/ui/data-details";
import BN from "bignumber.js";
import {
  format,
  getErrorMessage,
  getLiquidityProviderName,
  getSteps,
  isNativeAddress,
  promiseWithTimeout,
  toExactAmount,
  useParaswapBuildTxCallback,
  usePriceUsd,
  wagmiConfig,
  waitForConfirmations,
} from "@/lib";
import { useAccount } from "wagmi";
import { Address } from "viem";
import { estimateGas, sendTransaction, signTypedData } from "wagmi/actions";
import { approveAllowance } from "@/lib/approveAllowance";
import { useMutation } from "@tanstack/react-query";
import { useLiquidityHubSwapContext } from "./context";
import {
  useLiquidityHubApproval,
  useLiquidityHubQuote,
  useOptimalRate,
  useParaswapApproval,
} from "./hooks";
import {
  SwapConfirmationDialog,
  SwapProgressState,
  useSwapProgress,
} from "../swap-confirmation-dialog";
import { wrapToken } from "@/lib/wrapToken";
import { _TypedDataEncoder } from "@ethersproject/hash";
import { permit2Address, Quote } from "@orbs-network/liquidity-hub-sdk";
import { TransactionParams } from "@paraswap/sdk";
import { toast } from "sonner";
import { useNetwork, useToExactAmount } from "../hooks";
import { useAppState } from "@/store";

// Construct steps for swap to display in UI
const useSteps = (steps?: number[]) => {
  const {
    state: { inToken, signature },
  } = useLiquidityHubSwapContext();
  return useMemo((): SwapStep[] => {
    if (!steps || !inToken) return [];

    return steps.map((step) => {
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
        timeout: signature ? 60_000 : 40_000,
      };
    });
  }, [inToken, steps, signature]);
};

export function LiquidityHubConfirmationDialog({
  isOpen,
  onClose: _onClose,
}: {
  isOpen: boolean;
  onClose: (swapStatus?: SwapStatus) => void;
}) {
  const {
    state: { inputAmount, inToken, outToken, isLiquidityHubTrade },
  } = useLiquidityHubSwapContext();

  const {
    state: progressState,
    resetState: resetProgressState,
    updateState: updateProgressState,
  } = useSwapProgress();

  const parsedSteps = useSteps(progressState.steps);

  const { mutate: swapWithLiquidityHub } =
    useLiquidityHubSwapCallback(updateProgressState);
  const { mutate: swapWithParaswap } =
    useParaswapSwapCallback(updateProgressState);

  const paraswapApproval = useParaswapApproval();
  const liquidityHubApproval = useLiquidityHubApproval();

  const approvalLoading = isLiquidityHubTrade
    ? liquidityHubApproval.approvalLoading
    : paraswapApproval.approvalLoading;

  const onSubmit = useCallback(async () => {
    if (!isLiquidityHubTrade) {
      swapWithParaswap();
    } else {
      swapWithLiquidityHub();
    }
  }, [
    isLiquidityHubTrade,
    swapWithLiquidityHub,
    swapWithParaswap,
    updateProgressState,
  ]);

  const onClose = useCallback(() => {
    _onClose(progressState.swapStatus);
    setTimeout(() => {
      if (progressState.currentStep) {
        resetProgressState();
      }
    }, 500);
  }, [
    _onClose,
    progressState.swapStatus,
    progressState.currentStep,
    resetProgressState,
  ]);

  const usdValues = useUSDValues();

  const optimalRate = useOptimalRate().data;

  const quote = useLiquidityHubQuote().data;

  const result = isLiquidityHubTrade
    ? quote?.outAmount
    : optimalRate?.destAmount;

  const outAmount = useToExactAmount(result, outToken?.decimals);

  return (
    <SwapConfirmationDialog
      outToken={outToken}
      inToken={inToken}
      inAmount={Number(inputAmount)}
      outAmount={Number(outAmount)}
      isOpen={isOpen}
      onClose={onClose}
      swapStatus={progressState.swapStatus}
      mainContent={
        <SwapConfirmationDialog.Main
          fromTitle="Sell"
          toTitle="Buy"
          steps={parsedSteps}
          inUsd={format.dollar(Number(usdValues.srcUSD || "0"))}
          currentStep={progressState.currentStep}
          outUsd={format.dollar(Number(usdValues.destUSD || "0"))}
          submitSwapButton={
            <SubmitSwapButton
              approvalLoading={approvalLoading}
              onClick={onSubmit}
            />
          }
          details={<Details />}
        />
      }
    />
  );
}

const useUSDValues = () => {
  const {
    state: { inToken, outToken, inputAmount, isLiquidityHubTrade },
  } = useLiquidityHubSwapContext();
  const srcUSD = usePriceUsd(inToken?.address).data;
  const destUSD = usePriceUsd(outToken?.address).data;
  const optimalRate = useOptimalRate().data;
  const quote = useLiquidityHubQuote().data;

  return useMemo(() => {
    if (!isLiquidityHubTrade) {
      return {
        srcUSD: optimalRate?.srcUSD,
        destUSD: optimalRate?.destUSD,
      };
    }
    return {
      srcUSD: BN(inputAmount)
        .multipliedBy(srcUSD || 0)
        .toString(),
      destUSD: BN(toExactAmount(quote?.outAmount, outToken?.decimals))
        .multipliedBy(destUSD || 0)
        .toString(),
    };
  }, [
    isLiquidityHubTrade,
    srcUSD,
    destUSD,
    optimalRate,
    quote,
    inputAmount,
    outToken?.decimals,
  ]);
};

const SubmitSwapButton = ({
  onClick,
  approvalLoading,
}: {
  onClick: () => void;
  approvalLoading: boolean;
}) => {
  const {
    state: { inToken, outToken },
  } = useLiquidityHubSwapContext();
  return (
    <Button
      disabled={approvalLoading}
      size="lg"
      onClick={onClick}
      className="w-full"
    >
      Swap {inToken?.symbol} for {outToken?.symbol}
    </Button>
  );
};

const Details = () => {
  const optimalRate = useOptimalRate().data;
  const quote = useLiquidityHubQuote().data;
  const address = useAccount().address;
  const {
    state: { outToken, isLiquidityHubTrade },
  } = useLiquidityHubSwapContext();
  const outTokenUsd = usePriceUsd(outToken?.address).data;

  const gasPrice = useMemo(() => {
    if (!isLiquidityHubTrade) {
      return Number(optimalRate?.gasCostUSD || "0");
    }

    if (!outToken || !outTokenUsd) return 0;
    const gas = toExactAmount(quote?.gasAmountOut, outToken.decimals);

    return Number(gas) * outTokenUsd;
  }, [
    isLiquidityHubTrade,
    optimalRate?.gasCostUSD,
    outToken,
    outTokenUsd,
    quote?.gasAmountOut,
  ]);

  return (
    <div className="w-full mt-4 mb-4 flex gap-2 flex-col">
      <Card className="bg-slate-900">
        <div className="p-4 flex flex-col gap-2">
          <DataDetails
            data={{
              Network: "Polygon",
              "Network fee": format.dollar(gasPrice),
              "Routing source": getLiquidityProviderName(
                Boolean(isLiquidityHubTrade)
              ),
            }}
          />
        </div>
      </Card>
      <Card className="bg-slate-900">
        <div className="p-4">
          <DataDetails
            data={{
              Recipient: format.address(address || ""),
            }}
          />
        </div>
      </Card>
    </div>
  );
};

export const useParaswapSwapCallback = (
  updateSwapProgressState: (value: Partial<SwapProgressState>) => void
) => {
  const buildParaswapTxCallback = useParaswapBuildTxCallback();
  const optimalRate = useOptimalRate().data;
  const {
    state: { inToken },
  } = useLiquidityHubSwapContext();
  const { slippage } = useAppState();
  const wToken = useNetwork()?.wToken.address;
  const requiresApproval = useParaswapApproval().requiresApproval;
  
  const { address } = useAccount();

  return useMutation({
    mutationFn: async () => {
      if (!address) {
        throw new Error("Wallet not connected");
      }

      if (!inToken) {
        throw new Error("Input token not found");
      }

      if (!optimalRate) {
        throw new Error("No optimal rate found");
      }
      if (!wToken) {
        throw new Error("WToken not found");
      }

      try {
        updateSwapProgressState({ swapStatus: SwapStatus.LOADING });

        const steps = getSteps({
          inTokenAddress: inToken.address,
          requiresApproval,
          noWrap: true,
        });
        updateSwapProgressState({ steps });
        if (requiresApproval) {
          updateSwapProgressState({ currentStep: SwapSteps.Approve });
          await approveAllowance(
            address,
            isNativeAddress(inToken.address) ? wToken : inToken.address,
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

          updateSwapProgressState({ swapStatus: SwapStatus.FAILED });
        }

        if (!txPayload) {
          updateSwapProgressState({ swapStatus: SwapStatus.FAILED });

          throw new Error("Failed to build transaction");
        }

        console.log("Swapping...");

        await estimateGas(wagmiConfig, txPayload);

        const txHash = await sendTransaction(wagmiConfig, txPayload);

        await waitForConfirmations(txHash, 1, 20);

        updateSwapProgressState({ swapStatus: SwapStatus.SUCCESS });

        return txHash;
      } catch (error) {
        console.error(error);
        updateSwapProgressState({ swapStatus: SwapStatus.FAILED });
        toast.error("An error occurred while swapping");
        throw error;
      }
    },
  });
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
      (signTypedData as any)(wagmiConfig, payload),
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

export function useLiquidityHubSwapCallback(
  updateSwapProgressState: (partial: Partial<SwapProgressState>) => void
) {
  const {
    sdk: liquidityHub,
    state: { inToken },
    updateState,
  } = useLiquidityHubSwapContext();
  const { slippage } = useAppState();

  const buildParaswapTxCallback = useParaswapBuildTxCallback();
  const optimalRate = useOptimalRate().data;
  const { getLatestQuote, data: quote } = useLiquidityHubQuote();
  const requiresApproval = useLiquidityHubApproval().requiresApproval;

  const inTokenAddress = inToken?.address;

  return useMutation({
    mutationFn: async () => {
      // Fetch latest quote just before swap
      if (!inTokenAddress) {
        throw new Error("In token address is not set");
      }

      if (!quote || !optimalRate) {
        throw new Error("Quote or optimal rate is not set");
      }
      // Set swap status for UI
      updateSwapProgressState({ swapStatus: SwapStatus.LOADING });

      try {
        // Check if the inToken needs approval for allowance

        // Get the steps required for swap e.g. [Wrap, Approve, Swap]
        const steps = getSteps({
          inTokenAddress,
          requiresApproval,
        });

        updateSwapProgressState({ steps });

        // If the inToken needs to be wrapped then wrap
        if (steps.includes(SwapSteps.Wrap)) {
          updateSwapProgressState({ currentStep: SwapSteps.Wrap });
          await wrapTokenCallback(quote, {
            onRequest: liquidityHub.analytics.onWrapRequest,
            onSuccess: liquidityHub.analytics.onWrapSuccess,
            onFailure: liquidityHub.analytics.onWrapFailure,
          });
        }

        // If an appropriate allowance for inToken has not been approved
        // then get user to approve
        if (steps.includes(SwapSteps.Approve)) {
          updateSwapProgressState({ currentStep: SwapSteps.Approve });
          await approveCallback(quote.user, quote.inToken, {
            onRequest: liquidityHub.analytics.onApprovalRequest,
            onSuccess: liquidityHub.analytics.onApprovalSuccess,
            onFailure: liquidityHub.analytics.onApprovalFailed,
          });
        }

        // Fetch the latest quote again after the approval
        const latestQuote = await getLatestQuote();
        updateState({ acceptedQuote: latestQuote });

        // Set the current step to swap
        updateSwapProgressState({ currentStep: SwapSteps.Swap });

        // Sign the transaction for the swap
        const signature = await signTransaction(latestQuote, {
          onRequest: liquidityHub.analytics.onSignatureRequest,
          onSuccess: (signature) =>
            liquidityHub.analytics.onSignatureSuccess(signature || ""),
          onFailure: liquidityHub.analytics.onSignatureFailed,
        });
        updateState({ signature });

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
        updateSwapProgressState({ swapStatus: SwapStatus.SUCCESS });
      } catch (error) {
        updateSwapProgressState({ swapStatus: SwapStatus.FAILED });

        throw error;
      }
    },
  });
}

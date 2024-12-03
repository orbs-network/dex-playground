import { Button } from "@/components/ui/button";
import { SwapSteps } from "@/types";
import { Card } from "@/components/ui/card";
import { SwapStep, SwapStatus } from "@orbs-network/swap-ui";
import { useCallback, useMemo } from "react";
import { DataDetails } from "@/components/ui/data-details";
import {
  format,
  getLiquidityProviderName,
  toExactAmount,
  usePriceUsd,
  useTokenBalaces,
  useUsdAmount,
} from "@/lib";
import { useAccount } from "wagmi";
import { useLiquidityHubSwapContext } from "./useLiquidityHubSwapContext";
import {
  useLiquidityHubApproval,
  useOptimalRate,
  useParaswapApproval,
} from "./hooks";
import {
  SwapConfirmationDialog,
  useSwapProgress,
} from "../swap-confirmation-dialog";
import { useToExactAmount } from "../hooks";
import { useLiquidityHubSwapCallback } from "./useLiquidityHubSwapCallback";
import { useParaswapSwapCallback } from "./useParaswapSwapCallback";
import { useLiquidityHubQuote } from "./useLiquidityHubQuote";
import { useIsLiquidityHubTrade } from "./useIsLiquidityHubTrade";

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

export function LiquidityHubConfirmationDialog() {
  const {
    state: { inputAmount, inToken, outToken, confirmationModalOpen },
    updateState,
  } = useLiquidityHubSwapContext();

  const {
    state: progressState,
    resetState: resetProgressState,
    updateState: updateProgressState,
  } = useSwapProgress();

  const parsedSteps = useSteps(progressState.steps);
  const isLiquidityHubTrade = useIsLiquidityHubTrade();
  const { refetch: refetchBalances } = useTokenBalaces();

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
  }, [isLiquidityHubTrade, swapWithLiquidityHub, swapWithParaswap]);

  const onClose = useCallback(() => {
    updateState({
      confirmationModalOpen: false,
      proceedWithLiquidityHub: false,
      acceptedQuote: undefined,
      acceptedOptimalRate: undefined,
    });
    if (progressState.swapStatus === SwapStatus.SUCCESS) {
      updateState({ inputAmount: "" });
      refetchBalances();
    }
    setTimeout(() => {
      resetProgressState();
    }, 5_00);
  }, [progressState.swapStatus, resetProgressState, updateState, refetchBalances]);

  const usd = useUSD();
  const outAmount = useOutAmount();

  return (
    <SwapConfirmationDialog
      outToken={outToken}
      inToken={inToken}
      inAmount={Number(inputAmount)}
      outAmount={Number(outAmount)}
      isOpen={confirmationModalOpen}
      onClose={onClose}
      swapStatus={progressState.swapStatus}
      mainContent={
        <SwapConfirmationDialog.Main
          fromTitle="Sell"
          toTitle="Buy"
          steps={parsedSteps}
          inUsd={format.dollar(Number(usd.srcUSD || "0"))}
          currentStep={progressState.currentStep}
          outUsd={format.dollar(Number(usd.destUSD || "0"))}
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

const useOutAmount = () => {
  const _quote = useLiquidityHubQuote().data;
  const _optimalRate = useOptimalRate().data;
  const isLiquidityHubTrade = useIsLiquidityHubTrade();
  const { outToken, acceptedQuote, acceptedOptimalRate } =
    useLiquidityHubSwapContext().state;
  const quote = acceptedQuote || _quote;
  const optimalRate = acceptedOptimalRate || _optimalRate;
  const result = isLiquidityHubTrade
    ? quote?.outAmount
    : optimalRate?.destAmount;

  return useToExactAmount(result, outToken?.decimals);
};

const useUSD = () => {
  const {
    state: {
      inToken,
      outToken,
      inputAmount,
      acceptedQuote,
      acceptedOptimalRate,
    },
  } = useLiquidityHubSwapContext();
  const _quote = useLiquidityHubQuote().data;
  const _optimalRate = useOptimalRate().data;
  const isLiquidityHubTrade = useIsLiquidityHubTrade();
  const quote = acceptedQuote || _quote;
  const optimalRate = acceptedOptimalRate || _optimalRate;

  const lhAmountOutExact = useToExactAmount(
    acceptedQuote?.outAmount || quote?.outAmount,
    outToken?.decimals
  );

  const lhSrcUsd = useUsdAmount(inToken?.address, inputAmount);
  const lhDestUsd = useUsdAmount(outToken?.address, lhAmountOutExact);
  const srcUSD = isLiquidityHubTrade ? lhSrcUsd : optimalRate?.srcUSD;
  const destUSD = isLiquidityHubTrade ? lhDestUsd : optimalRate?.destUSD;

  return useMemo(() => {
    return {
      srcUSD,
      destUSD,
    };
  }, [srcUSD, destUSD]);
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
    state: { outToken },
  } = useLiquidityHubSwapContext();
  const outTokenUsd = usePriceUsd(outToken?.address).data;
  const isLiquidityHubTrade = useIsLiquidityHubTrade();

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

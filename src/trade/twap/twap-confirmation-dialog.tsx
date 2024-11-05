import { Button } from "@/components/ui/button";
import { SwapSteps } from "@/types";
import { useCallback, useMemo } from "react";
import {
  SwapConfirmationDialog,
  useSwapProgress,
} from "../swap-confirmation-dialog";
import {
  useDerivedTwapSwapData,
  useInputLabels,
  useInTokenUsd,
  useOutTokenUsd,
} from "./hooks";
import { useTwapContext } from "./context";
import { format, useGetRequiresApproval } from "@/lib";
import { OrderDetails } from "@/components/order-details";
import { useToExactAmount } from "../hooks";
import { SwapStatus } from "@orbs-network/swap-ui";
import { Address } from "viem";
import { useSubmitOrderCallback } from "./useSubmitOrderCallback";

export function TwapConfirmationDialog({
  isOpen,
  onClose: _onClose,
}: {
  isOpen: boolean;
  onClose: (swapStatus?: SwapStatus) => void;
}) {
  const context = useTwapContext();
  const { twapSDK, parsedInputAmount, isMarketOrder } = context;
  const { outToken, inToken, typedAmount } = context.state.values;
  const { destTokenAmount } = useDerivedTwapSwapData();
  const dstAmount = useToExactAmount(destTokenAmount, outToken?.decimals);
  const outAmountUsd = useOutTokenUsd();
  const inAmountUsd = useInTokenUsd();
  const { state, updateState, resetState } = useSwapProgress();
  const parsedSteps = useParsedSteps(state.steps);
  const { inputLabel, outputLabel } = useInputLabels();
  const { requiresApproval, approvalLoading } = useGetRequiresApproval(
    twapSDK.config.twapAddress as Address,
    inToken?.address,
    parsedInputAmount
  );
  const { mutate: onCreateOrder } = useSubmitOrderCallback(
    updateState,
    requiresApproval
  );

  const onClose = useCallback(() => {
    _onClose(state.swapStatus);
    if (state.currentStep) {
      resetState();
    }
  }, [_onClose, state.swapStatus, state.currentStep, resetState]);

  return (
    <SwapConfirmationDialog
      outToken={outToken}
      inToken={inToken}
      inAmount={typedAmount ? Number(typedAmount) : 0}
      outAmount={isMarketOrder ? undefined : Number(dstAmount)}
      isOpen={isOpen}
      onClose={onClose}
      swapStatus={state.swapStatus}
      mainContent={
        <SwapConfirmationDialog.Main
          fromTitle={inputLabel}
          toTitle={outputLabel}
          steps={parsedSteps}
          inUsd={format.dollar(Number(inAmountUsd || "0"))}
          currentStep={state.currentStep}
          outUsd={
            isMarketOrder
              ? undefined
              : format.dollar(Number(outAmountUsd || "0"))
          }
          submitSwapButton={
            <SubmitSwapButton
              onClick={onCreateOrder}
              loading={approvalLoading}
            />
          }
          details={<Details />}
        />
      }
    />
  );
}

const SubmitSwapButton = ({
  onClick,
  loading,
}: {
  onClick: () => void;
  loading: boolean;
}) => {
  return (
    <Button disabled={loading} className="w-full mt-4" onClick={onClick}>
      {loading ? "Loading..." : "Confirm order"}
    </Button>
  );
};

const useParsedSteps = (steps?: number[]) => {
  const { state } = useTwapContext();
  const { inToken } = state.values;
  return useMemo(() => {
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
        title: `Create order`,
        image: inToken?.logoUrl,
      };
    });
  }, [inToken, steps]);
};

const Details = () => {
  const { deadline, srcChunkAmount, chunks, fillDelay, destTokenMinAmount } =
    useDerivedTwapSwapData();
  const context = useTwapContext();
  const { isMarketOrder } = context;
  const { inToken, outToken } = context.state.values;
  return (
    <OrderDetails>
      <TradePrice />
      <OrderDetails.Deadline deadline={deadline} />
      {chunks > 1 && (
        <OrderDetails.TradeSize
          srcChunkAmount={srcChunkAmount}
          inToken={inToken}
        />
      )}
      {chunks > 1 && <OrderDetails.Chunks chunks={chunks} />}
      <OrderDetails.FillDelay fillDelay={fillDelay} />
      {!isMarketOrder && (
        <OrderDetails.MinReceived
          destTokenMinAmount={destTokenMinAmount}
          outToken={outToken}
        />
      )}
      <OrderDetails.Recepient />
    </OrderDetails>
  );
};

const TradePrice = () => {
  const { destTokenAmount } = useDerivedTwapSwapData();
  const { parsedInputAmount, state } = useTwapContext();
  const { inToken, outToken } = state.values;

  const inTokenAmountUi = useToExactAmount(
    parsedInputAmount,
    inToken?.decimals
  );
  const destAmountUi = useToExactAmount(destTokenAmount, outToken?.decimals);
  const price = Number(destAmountUi) / Number(inTokenAmountUi);

  return (
    <OrderDetails.Detail title="Trade price">
      {`1 ${inToken?.symbol} = `}
      {`${format.crypto(price)} ${outToken?.symbol}`}
    </OrderDetails.Detail>
  );
};

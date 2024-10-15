import { Button } from "@/components/ui/button";
import { SwapSteps } from "@/types";
import { useCallback } from "react";
import { SwapConfirmationDialog } from "../swap/swap-confirmation-dialog";
import { useDerivedTwapSwapData, useInputLabels, useInTokenUsd, useOutTokenUsd } from "./hooks";
import { useTwapContext } from "./twap-context";
import { useCreateOrder } from "./use-create-order";
import { format } from "@/lib";

export function TwapConfirmationDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const context = useTwapContext();
  const { outToken, inToken, typedAmount } = context.state.values;
  const { destTokenAmount } = useDerivedTwapSwapData();
  const outAmountUsd = useOutTokenUsd();
  const inAmountUsd = useInTokenUsd();
  const { mutate: onCreateOrder } = useCreateOrder();
  const parseSteps = useParseStepsCallback();
  const {inputLabel, outputLabel}  =useInputLabels()

  return (
    <SwapConfirmationDialog
      outToken={outToken}
      inToken={inToken}
      inAmount={typedAmount ? Number(typedAmount) : 0}
      inAmountUsd={inAmountUsd}
      outAmount={Number(destTokenAmount)}
      outAmountUsd={outAmountUsd}
      isOpen={isOpen}
      onClose={onClose}
      mainContent={
        <SwapConfirmationDialog.Main
          fromTitle={inputLabel}
          toTitle={outputLabel}
          parseSteps={parseSteps}
          inUsd={format.dollar(Number(inAmountUsd || "0"))}
          outUsd={format.dollar(Number(outAmountUsd || "0"))}
          SubmitSwapButton={SubmitSwapButton}
          onSubmitSwap={onCreateOrder}

        />
      }
    />
  );
}

const SubmitSwapButton = ({ onClick }: { onClick: () => void }) => {
  return <Button onClick={onClick}>Create order</Button>;
};

const useParseStepsCallback = () => {
  const { state } = useTwapContext();
  const { inToken } = state.values;
  return useCallback(
    (steps?: number[]) => {
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
    },
    [inToken]
  );
};

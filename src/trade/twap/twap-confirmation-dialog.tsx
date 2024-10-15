import { Button } from "@/components/ui/button";
import { SwapSteps } from "@/types";
import { useCallback, useMemo } from "react";
import { SwapConfirmationDialog } from "../swap/swap-confirmation-dialog";
import {
  useDerivedTwapSwapData,
  useInputLabels,
  useInTokenUsd,
  useOutTokenUsd,
} from "./hooks";
import { useTwapContext } from "./twap-context";
import {
  format,
  makeElipsisAddress,
  resolveNativeTokenAddress,
  useGetRequiresApproval,
} from "@/lib";
import { OrderDetails } from "@/components/order-details";
import { useExplorer, useToExactAmount } from "../hooks";
import { useAccount } from "wagmi";
import { useSwapState } from "../use-swap-state";
import { SwapStatus } from "@orbs-network/swap-ui";
import { Address } from "viem";
import {
  getSteps,
  isNativeAddress,
  isTxRejected,
  wagmiConfig,
  waitForConfirmations,
} from "@/lib";
import { approveAllowance } from "@/lib/approveAllowance";
import { wrapToken } from "@/lib/wrapToken";
import { TwapAbi, zeroAddress } from "@orbs-network/twap-sdk";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getTransactionReceipt,
  simulateContract,
  writeContract,
} from "wagmi/actions";
import { SwapState } from "../use-swap-state";
import { useWaitForNewOrderCallback } from "./orders/use-orders-query";

export function TwapConfirmationDialog({
  isOpen,
  onClose: _onClose,
}: {
  isOpen: boolean;
  onClose: (swapStatus?: SwapStatus) => void;
}) {
  const context = useTwapContext();
  const { twapSDK, parsedInputAmount } = context;
  const { outToken, inToken, typedAmount } = context.state.values;
  const { destTokenAmount } = useDerivedTwapSwapData();
  const dstAmount = useToExactAmount(destTokenAmount, outToken?.decimals);
  const outAmountUsd = useOutTokenUsd();
  const inAmountUsd = useInTokenUsd();
  const { state, updateState } = useSwapState();
  const parsedSteps = useParsedSteps(state.steps);
  const { inputLabel, outputLabel } = useInputLabels();
  const { requiresApproval, approvalLoading } = useGetRequiresApproval(
    twapSDK.config.twapAddress as Address,
    resolveNativeTokenAddress(inToken?.address),
    parsedInputAmount
  );
  const { mutate: onCreateOrder } = useCreateOrder(
    updateState,
    requiresApproval
  );

  const onClose = useCallback(() => {
    _onClose(state.swapStatus);
  }, [_onClose, state.swapStatus]);

  return (
    <SwapConfirmationDialog
      outToken={outToken}
      inToken={inToken}
      inAmount={typedAmount ? Number(typedAmount) : 0}
      outAmount={Number(dstAmount)}
      isOpen={isOpen}
      onClose={onClose}
      swapStatus={state.swapStatus}
      mainContent={
        <SwapConfirmationDialog.Main
          fromTitle={inputLabel}
          toTitle={outputLabel}
          steps={parsedSteps}
          inUsd={format.dollar(Number(inAmountUsd || "0"))}
          outUsd={format.dollar(Number(outAmountUsd || "0"))}
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
  const { inToken, outToken } = useTwapContext().state.values;
  return (
    <OrderDetails>
      <TradePrice />
      <OrderDetails.Deadline deadline={deadline} />
      <OrderDetails.TradeSize
        srcChunkAmount={srcChunkAmount}
        inToken={inToken}
      />
      <OrderDetails.Chunks chunks={chunks} />
      <OrderDetails.FillDelay fillDelay={fillDelay} />
      <OrderDetails.MinReceived
        destTokenMinAmount={destTokenMinAmount}
        outToken={outToken}
      />
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


function useCreateOrder(
  updateState: (state: Partial<SwapState>) => void,
  requiresApproval: boolean
) {
  const {
    twapSDK,
    parsedInputAmount,
    state: {
      values: { inToken, outToken },
    },
  } = useTwapContext();
  const derivedValues = useDerivedTwapSwapData();
  const { address: account } = useAccount();
  const {mutateAsync: waitForNewOrder} = useWaitForNewOrderCallback()

  return useMutation({
    mutationFn: async () => {
      try {
        if (!inToken || !account || !parsedInputAmount || !outToken) {
          throw new Error("Missing required dependencies");
        }
        updateState({ swapStatus: SwapStatus.LOADING });

        const steps = getSteps({
          inTokenAddress: inToken.address,
          requiresApproval,
        });
        updateState({ steps });

        if (steps.includes(SwapSteps.Wrap)) {
          updateState({ currentStep: SwapSteps.Wrap });
          await wrapToken(account, parsedInputAmount);
          // wrap
        }

        if (steps.includes(SwapSteps.Approve)) {
          await approveAllowance(
            account,
            inToken.address,
            twapSDK.config.twapAddress as Address
          );
          updateState({ currentStep: SwapSteps.Approve });
        }

        updateState({ currentStep: SwapSteps.Swap });

        const askParams = twapSDK
          .prepareOrderArgs({
            fillDelay: derivedValues.fillDelay,
            deadline: derivedValues.deadline,
            srcAmount: parsedInputAmount ?? "0",
            destTokenMinAmount: derivedValues.destTokenMinAmount,
            srcChunkAmount: derivedValues.srcChunkAmount,
            srcTokenAddress: inToken.address,
            destTokenAddress: isNativeAddress(outToken?.address)
              ? zeroAddress
              : outToken.address,
          })
          .map((it) => it.toString());

        const simulatedData = await simulateContract(wagmiConfig, {
          abi: TwapAbi,
          functionName: "ask",
          account: account as any,
          address: twapSDK.config.twapAddress as any,
          args: [askParams],
        });

        const hash = await writeContract(wagmiConfig, simulatedData.request);
        await waitForConfirmations(hash, 1, 20);
        const receipt = await getTransactionReceipt(wagmiConfig, {
          hash,
        });

        console.log({receipt});
        

        updateState({ swapStatus: SwapStatus.SUCCESS });
        toast.success("Order created successfully!");
        await waitForNewOrder(undefined)
        return receipt;
      } catch (error) {
        if (isTxRejected(error)) {
          updateState({ swapStatus: undefined });
        } else {
          updateState({ swapStatus: SwapStatus.FAILED });
        }
      }
    },
  });
}

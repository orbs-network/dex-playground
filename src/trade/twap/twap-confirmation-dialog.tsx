import { Button } from "@/components/ui/button";
import { SwapSteps } from "@/types";
import { useCallback, useMemo } from "react";
import { SwapConfirmationDialog } from "../swap-confirmation-dialog";
import {
  useDerivedTwapSwapData,
  useInputLabels,
  useInTokenUsd,
  useOutTokenUsd,
} from "./hooks";
import { useTwapContext } from "./twap-context";
import {
  format,
  resolveNativeTokenAddress,
  useGetRequiresApproval,
} from "@/lib";
import { OrderDetails } from "@/components/order-details";
import { useToExactAmount } from "../hooks";
import { useAccount } from "wagmi";
import { useSwapState } from "../use-swap-state";
import { SwapStatus } from "@orbs-network/swap-ui";
import { Address, hexToNumber } from "viem";
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
  const { twapSDK, parsedInputAmount, isMarketOrder } = context;
  const { outToken, inToken, typedAmount } = context.state.values;
  const { destTokenAmount } = useDerivedTwapSwapData();
  const dstAmount = useToExactAmount(destTokenAmount, outToken?.decimals);
  const outAmountUsd = useOutTokenUsd();
  const inAmountUsd = useInTokenUsd();
  const { state, updateState, resetState } = useSwapState();
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
    if(state.currentStep) {
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

const useWrapCallback = () => {
  const { twapSDK } = useTwapContext();

  return useCallback(
    async (account: string, inAmount: string) => {
      try {
        twapSDK.analytics.onWrapRequest();
        await wrapToken(account, inAmount);
        twapSDK.analytics.onWrapSuccess();
      } catch (error) {
        twapSDK.analytics.onWrapError(error);
        throw error;
      }
    },
    [twapSDK]
  );
};

const useApproveCallback = () => {
  const { twapSDK } = useTwapContext();

  return useCallback(
    async (account: string, inTokenAddress: string) => {
      try {
        twapSDK.analytics.onApproveRequest();

        const tokenAddress = resolveNativeTokenAddress(inTokenAddress);

        if (!tokenAddress) {
          throw new Error("Token address not found");
        }

        await approveAllowance(
          account,
          tokenAddress,
          twapSDK.config.twapAddress as Address
        );
        twapSDK.analytics.onApproveSuccess();
      } catch (error) {
        twapSDK.analytics.onApproveError(error);
        throw error;
      }
    },
    [twapSDK]
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
  const { mutateAsync: waitForNewOrder } = useWaitForNewOrderCallback();
  const wrapTokenCallback = useWrapCallback();
  const approveAllowanceCallback = useApproveCallback();

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
          await wrapTokenCallback(account, parsedInputAmount);
          // wrap
        }

        if (steps.includes(SwapSteps.Approve)) {
          updateState({ currentStep: SwapSteps.Approve });
          await approveAllowanceCallback(account, inToken.address);
        }

        updateState({ currentStep: SwapSteps.Swap });
        const askParams = twapSDK
        .prepareOrderArgs({
          fillDelay: derivedValues.fillDelay,
          deadline: derivedValues.deadline,
          srcAmount: parsedInputAmount ?? "0",
          destTokenMinAmount: derivedValues.destTokenMinAmount,
          srcChunkAmount: derivedValues.srcChunkAmount,
          srcTokenAddress: resolveNativeTokenAddress(inToken.address)!,
          destTokenAddress: isNativeAddress(outToken?.address)
            ? zeroAddress
            : outToken.address,
        })
        .map((it) => it.toString());

      twapSDK.analytics.onCreateOrderRequest(askParams, account);
        const simulatedData = await simulateContract(wagmiConfig, {
          abi: TwapAbi,
          functionName: "ask",
          account: account as Address,
          address: twapSDK.config.twapAddress as Address,
          args: [askParams],
        });

        const hash = await writeContract(wagmiConfig, simulatedData.request);
        await waitForConfirmations(hash, 1, 20);
        const receipt = await getTransactionReceipt(wagmiConfig, {
          hash,
        });

        const orderID = hexToNumber(receipt.logs[0].topics[1]!)
      
        await waitForNewOrder(orderID);
        twapSDK.analytics.onCreateOrderSuccess(hash);
        toast.success("Order created successfully!");
        updateState({ swapStatus: SwapStatus.SUCCESS });

        return receipt;
      } catch (error) {
        
        if (isTxRejected(error)) {
          updateState({ swapStatus: undefined });
        } else {
          twapSDK.analytics.onCreateOrderError(error);
          updateState({ swapStatus: SwapStatus.FAILED });
        }
      }
    },
  });
}

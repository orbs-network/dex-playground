import {
  waitForConfirmations,
  wagmiConfig,
  useWrapToken,
  useApproveAllowance,
  isNativeAddress,
  getSteps,
  isTxRejected,
} from "@/lib";
import { SwapSteps } from "@/types";
import { SwapStatus } from "@orbs-network/swap-ui";
import { TwapAbi } from "@orbs-network/twap-sdk";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { hexToNumber, zeroAddress } from "viem";
import { useWriteContract, useAccount } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { useNetwork } from "../hooks";
import { SwapProgressState } from "../confirmation-dialog";
import { useTwapContext } from "./context";
import { useDerivedTwapSwapData } from "./hooks";
import { useWaitForNewOrderCallback } from "./orders/use-orders-query";

const useCreateOrder = () => {
  const { writeContractAsync } = useWriteContract();
  const derivedValues = useDerivedTwapSwapData();
  const { twapSDK, parsedInputAmount } = useTwapContext();
  const { mutateAsync: waitForNewOrder } = useWaitForNewOrderCallback();
  const { address: account } = useAccount();

  return useMutation({
    mutationFn: async ({
      srcTokenAddress,
      destTokenAddress,
    }: {
      srcTokenAddress: string;
      destTokenAddress: string;
    }) => {
      const askParams = twapSDK
        .prepareOrderArgs({
          fillDelay: derivedValues.fillDelay,
          deadline: derivedValues.deadline,
          srcAmount: parsedInputAmount ?? "0",
          destTokenMinAmount: derivedValues.destTokenMinAmount,
          srcChunkAmount: derivedValues.srcChunkAmount,
          srcTokenAddress,
          destTokenAddress,
        })
        .map((it) => it.toString());

      twapSDK.analytics.onCreateOrderRequest(askParams, account);

      const txHash = await (writeContractAsync as any)({
        abi: TwapAbi,
        functionName: "ask",
        account: account,
        address: twapSDK.config.twapAddress,
        args: [askParams],
      });
      let receipt: any;

      try {
        await waitForConfirmations(txHash, 1, 20);
        receipt = await waitForTransactionReceipt(wagmiConfig as any, {
          hash: txHash,
        });
      } catch (error) {
        console.log({ error });
      }

      const orderID = hexToNumber(receipt.logs[0].topics[1]!);

      await waitForNewOrder(orderID);
      twapSDK.analytics.onCreateOrderSuccess(txHash);
      return {
        orderID,
        txHash,
      };
    },
    onError: (error) => {
      twapSDK.analytics.onCreateOrderError(error);
      console.error(error);
      throw error;
    },
  });
};

export function useSubmitOrderCallback(
  updateState: (state: Partial<SwapProgressState>) => void,
  requiresApproval: boolean
) {
  const {
    twapSDK,
    parsedInputAmount,
    state: {
      values: { inToken, outToken },
    },
  } = useTwapContext();
  const { mutateAsync: wrap } = useWrapToken();
  const { address: account } = useAccount();
  const { mutateAsync: approve } = useApproveAllowance();
  const { mutateAsync: createOrder } = useCreateOrder();
  const wToken = useNetwork()?.wToken.address;
  return useMutation({
    mutationFn: async () => {
      try {
        const srcTokenAddress = isNativeAddress(inToken?.address)
          ? wToken
          : inToken?.address;

        const destTokenAddress = isNativeAddress(outToken?.address)
          ? zeroAddress
          : outToken?.address;
        if (
          !inToken ||
          !account ||
          !parsedInputAmount ||
          !outToken ||
          !srcTokenAddress ||
          !destTokenAddress
        ) {
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
          try {
            twapSDK.analytics.onWrapRequest();
            await wrap(parsedInputAmount);
            twapSDK.analytics.onWrapSuccess();
          } catch (error) {
            twapSDK.analytics.onWrapError(error);
            throw error;
          }
          // wrap
        }

        if (steps.includes(SwapSteps.Approve)) {
          updateState({ currentStep: SwapSteps.Approve });
          try {
            twapSDK.analytics.onApproveRequest();
            await approve({
              spender: twapSDK.config.twapAddress,
              token: srcTokenAddress,
              amount: parsedInputAmount,
            });
            twapSDK.analytics.onApproveSuccess();
          } catch (error) {
            twapSDK.analytics.onApproveError(error);
            throw error;
          }
        }
        updateState({ currentStep: SwapSteps.Swap });
        const response = await createOrder({
          srcTokenAddress,
          destTokenAddress,
        });
        updateState({ swapStatus: SwapStatus.SUCCESS });
        return response.orderID;
      } catch (error) {
        if (isTxRejected(error)) {
          updateState({ swapStatus: undefined });
        } else {
          updateState({ swapStatus: SwapStatus.FAILED });
          toast.error("Create order failed");
        }
      }
    },
  });
}

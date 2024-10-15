import {
  getSteps,
  isNativeAddress,
  resolveNativeTokenAddress,
} from "@/lib";
import { approveAllowance } from "@/lib/approveAllowance";
import { getRequiresApproval } from "@/lib/getRequiresApproval";
import { wrapToken } from "@/lib/wrapToken";
import { onSubmitArgs, SwapSteps } from "@/types";
import { SwapStatus } from "@orbs-network/swap-ui";
import { zeroAddress } from "@orbs-network/twap-sdk";
import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import { Address } from "viem";
import { useAccount } from "wagmi";
import { useDerivedTwapSwapData } from "./hooks";
import { useTwapContext } from "./twap-context";

const usePrepareOrderArgs = () => {
  const { twapSDK, parsedInputAmount, state } = useTwapContext();
  const { inToken, outToken } = state.values;
  const derivedValues = useDerivedTwapSwapData();
  return useCallback(() => {
    if (!twapSDK || !inToken || !outToken) {
      throw new Error("Missing required dependencies");
    }
    return twapSDK.prepareOrderArgs({
      fillDelay: derivedValues.fillDelay,
      deadline: derivedValues.deadline,
      srcAmount: parsedInputAmount ?? "0",
      destTokenMinAmount: derivedValues.destTokenMinAmount,
      srcChunkAmount: derivedValues.srcChunkAmount,
      srcTokenAddress: inToken.address,
      destTokenAddress: isNativeAddress(outToken?.address)
        ? zeroAddress
        : outToken.address,
    });
  }, [
    twapSDK,
    parsedInputAmount,
    inToken,
    outToken,
    derivedValues.fillDelay,
    derivedValues.deadline,
    derivedValues.destTokenMinAmount,
    derivedValues.srcChunkAmount,
  ]);
};

export function useCreateOrder() {
  const {
    twapSDK,
    parsedInputAmount,
    state: {
      values: { inToken },
    },
  } = useTwapContext();
  const prepareOrderArgs = usePrepareOrderArgs();
  const { address: account } = useAccount();

  return useMutation({
    mutationFn: async ({
      onSteps,
      onStatus,
      onStepChange,
    }: onSubmitArgs) => {
      if (!inToken || !account || !parsedInputAmount) {
        throw new Error("Missing required dependencies");
      }
      onStatus(SwapStatus.LOADING);
      const requiresApproval = await getRequiresApproval(
        twapSDK.config.twapAddress as string,
        resolveNativeTokenAddress(inToken.address),
        parsedInputAmount,
        account as string
      );

      const steps = getSteps({
        inTokenAddress: inToken.address,
        requiresApproval,
      });
      onSteps(steps);

      if (steps.includes(SwapSteps.Wrap)) {
        onStepChange(SwapSteps.Wrap);
        await wrapToken(account, parsedInputAmount);
        // wrap
      }

      if (steps.includes(SwapSteps.Approve)) {
        await approveAllowance(
          account,
          inToken.address,
          twapSDK.config.twapAddress as Address
        );
        onStepChange(SwapSteps.Approve);
      }

      onStepChange(SwapSteps.Swap);

      const args = prepareOrderArgs();

      //   const simulatedData = await simulateContract(wagmiConfig, {
      //     abi: TwapAbi,
      //     functionName: "ask",
      //     account: account as Address,
      //     address: twapSDK.config.twapAddress as Address,
      //     args,
      //   });
    },
  });
}

import {
  getSteps,
  useApproveAllowance,
  useParaswapBuildTxCallback,
  waitForConfirmations,
} from "@/lib";
import { useAppState } from "@/store";
import { SwapSteps } from "@/types";
import { SwapStatus } from "@orbs-network/swap-ui";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAccount, useSendTransaction } from "wagmi";
import { useNetwork } from "../hooks";
import { SwapProgressState } from "../swap-confirmation-dialog";
import { useLiquidityHubSwapContext } from "./useLiquidityHubSwapContext";
import { useOptimalRate, useParaswapApproval } from "./hooks";

export const useParaswapSwapCallback = (
  updateSwapProgressState: (value: Partial<SwapProgressState>) => void
) => {
  const buildParaswapTxCallback = useParaswapBuildTxCallback();
  const { data: optimalRate, refetch: refetchOptimalRate } = useOptimalRate();
  const {
    state: { inToken },
    updateState,
  } = useLiquidityHubSwapContext();
  const { slippage } = useAppState();
  const wToken = useNetwork()?.wToken.address;
  const requiresApproval = useParaswapApproval().requiresApproval;
  const { mutateAsync: approve } = useApproveAllowance();

  const { address } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();

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
          await approve({
            token: inToken.address,
            spender: optimalRate.tokenTransferProxy,
            amount: optimalRate.srcAmount,
          });
        }

        updateSwapProgressState({ currentStep: SwapSteps.Swap });

        let txPayload: unknown | null = null;

        let acceptedOptimalRate = optimalRate;

        try {
          const result = await refetchOptimalRate();
          if (result.data) {
            acceptedOptimalRate = result.data;
          }
        } catch (error) {
          console.error(error);
        }

        updateState({ acceptedOptimalRate });

        try {
          const txData = await buildParaswapTxCallback(acceptedOptimalRate, slippage);

          txPayload = {
            account: txData.from,
            to: txData.to,
            data: txData.data,
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

        const txHash = await sendTransactionAsync(txPayload);

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

import {
  useParaswapBuildTxCallback,
  getSteps,
  useWrapToken,
  useApproveAllowance,
  promiseWithTimeout,
} from "@/lib";
import { useAppState } from "@/store";
import { SwapSteps } from "@/types";
import { _TypedDataEncoder } from "@ethersproject/hash";
import { permit2Address, Quote } from "@orbs-network/liquidity-hub-sdk";
import { SwapStatus } from "@orbs-network/swap-ui";
import { TransactionParams } from "@paraswap/sdk";
import { useMutation } from "@tanstack/react-query";
import { useSignTypedData } from "wagmi";
import { SwapProgressState } from "../swap-confirmation-dialog";
import { useLiquidityHubSwapContext } from "./useLiquidityHubSwapContext";
import { useOptimalRate, useLiquidityHubApproval } from "./hooks";
import { useLiquidityHubQuote } from "./useLiquidityHubQuote";

export const isRejectedError = (error: any) => {
  const message = error.message?.toLowerCase();
  return message?.includes('rejected') || message?.includes('denied');
};


export function useLiquidityHubSwapCallback(
  updateSwapProgressState: (values: Partial<SwapProgressState>) => void
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
  const { mutateAsync: wrap } = useWrapToken();
  const { mutateAsync: approve } = useApproveAllowance();
  const { mutateAsync: sign } = useSign();

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
          try {
            liquidityHub.analytics.onWrapRequest();
            await wrap(quote.inAmount);
            liquidityHub.analytics.onWrapSuccess();
          } catch (error) {
            liquidityHub.analytics.onWrapFailure((error as Error).message);
            throw error;
          }
        }

        // If an appropriate allowance for inToken has not been approved
        // then get user to approve
        if (steps.includes(SwapSteps.Approve)) {
          updateSwapProgressState({ currentStep: SwapSteps.Approve });
          try {
            liquidityHub.analytics.onApprovalRequest();
            // Perform the approve contract function
            const txHash = await approve({
              token: inTokenAddress,
              spender: permit2Address,
              amount: quote.inAmount,
            });
            liquidityHub.analytics.onApprovalSuccess(txHash);
          } catch (error) {
            liquidityHub.analytics.onApprovalFailed((error as Error).message);
            throw error;
          }
        }

        // Fetch the latest quote again after the approval
        let latestQuote = quote;
        try {
          const result = await getLatestQuote();
          if (result) {
            latestQuote = result;
          }
        } catch (error) {
          console.error(error);
        }
        updateState({ acceptedQuote: latestQuote });

        // Set the current step to swap
        updateSwapProgressState({ currentStep: SwapSteps.Swap });

        // Sign the transaction for the swap
        let signature = "";
        try {
          liquidityHub.analytics.onSignatureRequest();
          signature = await sign(latestQuote);
          liquidityHub.analytics.onSignatureSuccess(signature);
          updateState({ signature });
        } catch (error) {
          liquidityHub.analytics.onSignatureFailed((error as Error).message);
          throw error;
        }

        // Pass the liquidity provider txData if possible
        let paraswapTxData: TransactionParams | undefined;

        try {
          paraswapTxData = await buildParaswapTxCallback(optimalRate, slippage);
        } catch (error) {
          console.error(error);
        }

        console.log("Swapping...", latestQuote);
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
        if(isRejectedError(error)) {
          updateSwapProgressState({ swapStatus: undefined });
        }else{
          updateSwapProgressState({ swapStatus: SwapStatus.FAILED });
          throw error;
        }

      }
    },
  });
}

const useSign = () => {
  const { signTypedDataAsync } = useSignTypedData();
  return useMutation({
    mutationFn: async (quote: Quote) => {
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

      const signature = await promiseWithTimeout<string>(
        (signTypedDataAsync)(payload),
        40_000
      );

      console.log("Transaction signed", signature);
      return signature;
    },
  });
};

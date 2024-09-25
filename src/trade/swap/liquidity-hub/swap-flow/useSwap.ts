import { wagmiConfig } from "@/lib/wagmi-config";
import { useMutation } from "@tanstack/react-query";
import { signTypedData } from "wagmi/actions";
import { _TypedDataEncoder } from "@ethersproject/hash";
import { toast } from "sonner";
import { Quote,} from "@orbs-network/liquidity-hub-sdk";
import { SwapStatus } from "@orbs-network/swap-ui";
import { Steps } from "../types";
import { getSteps } from "./getSteps";
import { approveAllowance } from "./approveAllowance";
import { wrapToken } from "./wrapToken";
import { useLiquidityHub } from "../provider/useLiquidityHub";
import { useLiquidityHubSDK } from "../liquidity-hub-sdk";

export function useSwap() {
  const { setSteps} = useLiquidityHub();
  
  const liquidityHub = useLiquidityHubSDK();
  return useMutation({
    mutationFn: async ({
      inTokenAddress,
      getQuote,
      requiresApproval,
      onAcceptQuote,
      setSwapStatus,
      setCurrentStep
    }: {
      inTokenAddress: string;
      getQuote: () => Promise<Quote>;
      requiresApproval: boolean;
      onAcceptQuote: (quote: Quote) => void;
      setSwapStatus: (status?: SwapStatus) => void;
      setCurrentStep: (step: Steps) => void;
    }) => {
      const quote = await getQuote();
      console.log("swapping", quote, status);
      console.log("inside", quote, status);

      setSwapStatus(SwapStatus.LOADING);

      // getSteps
      const steps = getSteps({ inTokenAddress, requiresApproval });
      setSteps(steps);

      // wrapToken
      if (steps.includes(Steps.Wrap)) {
        setCurrentStep(Steps.Wrap);
        await wrapToken(quote);
      }

      // approveAllowance
      if (steps.includes(Steps.Approve)) {
        setCurrentStep(Steps.Approve);
        await approveAllowance(quote.user, quote.inToken);
      }

      // we need to get the latest quote after the approval
      const latestQuote = await getQuote();
      onAcceptQuote(latestQuote);

      // swap
      setCurrentStep(Steps.Swap);

      const { permitData } = latestQuote;

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

      console.log(payload);

      try {
        const signature = await promiseWithTimeout(signTypedData(wagmiConfig, payload), 40_000)
        console.log("signature", signature);

        const txHash = await liquidityHub.swap(latestQuote, signature as string);

        if (!txHash) {
          throw new Error("Swap failed");
        }
        console.log("txHash", txHash);

        const txDetails = await liquidityHub.getTransactionDetails(
          txHash,
          latestQuote
        );
        console.log("txDetails", txDetails);
        setSwapStatus(SwapStatus.SUCCESS);

        return txDetails;
      } catch (error) {
        console.log(error);
        setSwapStatus(SwapStatus.FAILED);
        const err = error as Error;
        toast.error(
          "message" in err
            ? err.message.length > 100
              ? `${err.message.slice(0, 100)}...`
              : err.message
            : "An error occurred while swapping your token"
        );
      }
    },
  });
}


export async function promiseWithTimeout<T>(
  promise: Promise<T>,
  timeout: number,
): Promise<T> {
  let timer: any;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error('timeout'));
    }, timeout);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer);
    return result;
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
}
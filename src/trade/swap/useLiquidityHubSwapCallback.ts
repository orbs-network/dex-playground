import {
  useParaswapBuildTxCallback,
  getSteps,
  useWrapToken,
  useApproveAllowance,
  useTokenBalances,
} from '@/lib';
import { useAppState } from '@/store';
import { SwapSteps } from '@/types';
import { _TypedDataEncoder } from '@ethersproject/hash';
import { permit2Address, Quote } from '@orbs-network/liquidity-hub-sdk';
import { SwapStatus } from '@orbs-network/swap-ui';
import { TransactionParams } from '@paraswap/sdk';
import { useMutation } from '@tanstack/react-query';
import { useSignTypedData } from 'wagmi';
import { useOptimalRate, useLiquidityHubApproval } from './hooks';
import { useLiquidityHubQuote } from './useLiquidityHubQuote';
import { SwapProgressState } from '../confirmation-dialog';
import { useLiquidityHubSwapContext } from './context';

export const isRejectedError = (error: Error) => {
  const message = error.message?.toLowerCase();
  return message?.includes('rejected') || message?.includes('denied');
};

export function useLiquidityHubSwapCallback(
  updateProgress: (value: Partial<SwapProgressState>) => void
) {
  const {
    sdk: liquidityHub,
    state: { inToken },
    updateState,
  } = useLiquidityHubSwapContext();
  const { slippage, isLiquidityHubOnly } = useAppState();
  const { refetch: refetchBalances } = useTokenBalances();

  const buildParaswapTxCallback = useParaswapBuildTxCallback();
  const { refetch: refetchOptimalRate } = useOptimalRate();
  const { refetch: refetchQuote, data: _quote } = useLiquidityHubQuote();
  const requiresApproval = useLiquidityHubApproval().requiresApproval;
  const { mutateAsync: wrap } = useWrapToken();
  const { mutateAsync: approve } = useApproveAllowance();
  const { mutateAsync: sign } = useSign();

  const inTokenAddress = inToken?.address;

  return useMutation({
    mutationFn: async () => {
      // Fetch latest quote just before swap
      if (!inTokenAddress) {
        throw new Error('In token address is not set');
      }

      const steps = getSteps({
        inTokenAddress,
        requiresApproval,
      });
      updateProgress({ steps });

      let quote = _quote;
      const shouldRefetchQuote =
        steps.includes(SwapSteps.Approve) || steps.includes(SwapSteps.Wrap) || isLiquidityHubOnly;

      if (!quote) {
        throw new Error('Quote or optimal rate is not set');
      }
      // Set swap status for UI
      updateProgress({ swapStatus: SwapStatus.LOADING });

      try {
        // If the inToken needs to be wrapped then wrap
        if (steps.includes(SwapSteps.Wrap)) {
          updateProgress({ currentStep: SwapSteps.Wrap });
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
          updateProgress({ currentStep: SwapSteps.Approve });
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
        updateProgress({ currentStep: SwapSteps.Swap });

        if (shouldRefetchQuote) {
          quote = await refetchQuote();
        }

        if (!quote) {
          throw new Error('Quote is not set');
        }

        // Sign the transaction for the swap
        let signature = '';
        try {
          liquidityHub.analytics.onSignatureRequest();
          signature = await sign(quote);
          liquidityHub.analytics.onSignatureSuccess(signature);
          updateState({ signature });
        } catch (error) {
          liquidityHub.analytics.onSignatureFailed((error as Error).message);
          throw error;
        }

        // Pass the liquidity provider txData if possible
        let paraswapTxData: TransactionParams | undefined;

        try {
          const optimalRate = (await refetchOptimalRate()).data;
          paraswapTxData = optimalRate && (await buildParaswapTxCallback(optimalRate, slippage));
        } catch (error) {
          console.error(error);
        }

        console.log('Swapping...', quote);
        // Call Liquidity Hub sdk swap and wait for transaction hash
        const txHash = await liquidityHub.swap(quote, signature as string, {
          data: paraswapTxData?.data,
          to: paraswapTxData?.to,
        });

        if (!txHash) {
          throw new Error('Swap failed');
        }

        // Fetch the successful transaction details
        await liquidityHub.getTransactionDetails(txHash, quote);

        updateProgress({ swapStatus: SwapStatus.SUCCESS });
      } catch (error) {
        if (isRejectedError(error as Error)) {
          updateProgress({ swapStatus: undefined });
        } else {
          updateProgress({ swapStatus: SwapStatus.FAILED });
          throw error;
        }
      } finally {
        refetchBalances();
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
      const signature = await signTypedDataAsync(payload);

      console.log('Transaction signed', signature);
      return signature;
    },
  });
};

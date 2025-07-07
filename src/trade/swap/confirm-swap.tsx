import { ErrorCodes, amountMinusSlippage } from '@/lib';
import { useAppState } from '@/store';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useCallback, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { useLiquidityHubInputError, useOptimalRate, useSwapOutAmount } from './hooks';
import { useLiquidityHubQuote } from './useLiquidityHubQuote';
import BN from 'bignumber.js';
import { Button } from '@/components/ui/button';
import { SwapConfirmationDialog } from './swap-confirmation-dialog';
import { useLiquidityHubSwapContext } from './context';

const useSubmitSwap = () => {
  const { data: optimalRate } = useOptimalRate();
  const { refetch: refetchQuote } = useLiquidityHubQuote();
  const { slippage } = useAppState();
  const { updateState } = useLiquidityHubSwapContext();
  const [isLoading, setIsLoading] = useState(false);
  const { isLiquidityHubOnly } = useAppState();

  const onSubmit = useCallback(async () => {
    if (isLiquidityHubOnly) {
      updateState({ confirmationModalOpen: true, isLiquidityHubTrade: true });
      return;
    }
    try {
      setIsLoading(true);
      updateState({ confirmationModalOpen: true });

      const quote = await refetchQuote();
      const isLiquidityHubTrade = BN(quote?.userMinOutAmountWithGas || '').gt(
        amountMinusSlippage(slippage, optimalRate?.destAmount || '0')
      );

      updateState({ isLiquidityHubTrade });
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [optimalRate, slippage, updateState, refetchQuote, isLiquidityHubOnly]);

  return {
    isLoading,
    onSubmit,
  };
};

export const ConfirmSwap = () => {
  const account = useAccount().address;
  const openConnectModal = useConnectModal().openConnectModal;
  const inputError = useLiquidityHubInputError();
  const { onSubmit, isLoading } = useSubmitSwap();
  const outAmount = useSwapOutAmount();

  const {
    state: { inputAmount },
  } = useLiquidityHubSwapContext();

  const { text, onClick } = useMemo(() => {
    if (!account) {
      return {
        text: 'Connect wallet',
        onClick: openConnectModal,
      };
    }
    if (inputError === ErrorCodes.InsufficientBalance) {
      return {
        text: 'Insufficient balance',
      };
    }
    if (inputError === ErrorCodes.EnterAmount) {
      return {
        text: 'Enter amount',
      };
    }

    if (!outAmount && inputAmount) {
      return {
        text: 'Fetching rate...',
      };
    }

    return {
      text: 'Swap',
      onClick: onSubmit,
    };
  }, [account, inputError, outAmount, inputAmount, onSubmit, openConnectModal]);

  return (
    <>
      <Button className="mt-2" size="lg" onClick={onClick} disabled={!onClick}>
        {text}
      </Button>
      <SwapConfirmationDialog isLoading={isLoading} />
    </>
  );
};

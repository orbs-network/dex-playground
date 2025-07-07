import { TokenCard } from '@/components/tokens/token-card';
import { SwitchButton } from '@/components/ui/switch-button';
import { useCallback } from 'react';
import { Token } from '@/types';
import '../style.css';
import { LiquidityHubSwapProvider, useLiquidityHubSwapContext } from './context';
import { useToExactAmount } from '../hooks';
import {
  useLiquidityHubInputError,
  useOptimalRate,
  useQuoteLoading,
  useSwapOutAmount,
} from './hooks';
import { SwapDetails } from './swap-details';
import { ConfirmSwap } from './confirm-swap';
import { useAppState } from '@/store';
import { useUsdAmount } from '@/lib';

function SwapPanel() {
  return (
    <div>
      <div className="flex flex-col gap-2 pt-2">
        <InTokenCard />
        <Switch />
        <OutTokenCard />
        <SwapDetails />
        <ConfirmSwap />
      </div>
    </div>
  );
}

const Switch = () => {
  const {
    state: { inToken, outToken },
    updateState,
  } = useLiquidityHubSwapContext();

  const handleSwitch = useCallback(() => {
    updateState({
      inToken: outToken,
      outToken: inToken,
      inputAmount: '',
    });
  }, [inToken, outToken, updateState]);

  return (
    <div className="h-0 relative z-10 flex items-center justify-center">
      <SwitchButton onClick={handleSwitch} />
    </div>
  );
};


const InTokenCard = () => {
  const {
    state: { inputAmount, inToken },
    onTokenSelect,
    updateState,
  } = useLiquidityHubSwapContext();
  const { isLiquidityHubOnly } = useAppState();
  const onSelectToken = useCallback(
    (inToken: Token) => {
      onTokenSelect('in', inToken);
    },
    [onTokenSelect]
  );

  const onValueChange = useCallback(
    (inputAmount: string) => {
      updateState({ inputAmount });
    },
    [updateState]
  );

  const inputError = useLiquidityHubInputError();
  const lh = useUsdAmount(inToken?.address, inputAmount);
  const paraswap = useOptimalRate().data;

  return (
    <TokenCard
      label="Sell"
      amount={inputAmount}
      amountUsd={isLiquidityHubOnly ? lh : paraswap?.srcUSD}
      selectedToken={inToken}
      onSelectToken={onSelectToken}
      onValueChange={onValueChange}
      inputError={inputError}
    />
  );
};

const OutTokenCard = () => {
  const paraswap = useOptimalRate().data?.destUSD;
  const {
    state: { outToken },
    onTokenSelect
  } = useLiquidityHubSwapContext();
  const destAmount = useToExactAmount(useSwapOutAmount(), outToken?.decimals);
  
  const { isLiquidityHubOnly } = useAppState();

  const onSelectToken = useCallback(
    (outToken: Token) => {
      onTokenSelect('out', outToken);
    },
    [onTokenSelect]
  );

  const lh = useUsdAmount(outToken?.address, destAmount);

  const isLoading = useQuoteLoading();
  return (
    <TokenCard
      label="Buy"
      amount={destAmount ?? ''}
      amountUsd={isLiquidityHubOnly ? lh : paraswap}
      selectedToken={outToken}
      onSelectToken={onSelectToken}
      isAmountEditable={false}
      amountLoading={isLoading}
    />
  );
};

export const Swap = () => {
  return (
    <LiquidityHubSwapProvider>
      <SwapPanel />
    </LiquidityHubSwapProvider>
  );
};

import { TokenCard } from "@/components/tokens/token-card";
import { SwitchButton } from "@/components/ui/switch-button";
import { useCallback, useMemo } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { _TypedDataEncoder } from "@ethersproject/hash";
import { Token } from "@/types";
import { ErrorCodes } from "@/lib";
import "../style.css";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import {
  LiquidityHubSwapProvider,
  useLiquidityHubSwapContext,
} from "./context";
import { useToExactAmount } from "../hooks";
import { LiquidityHubConfirmationDialog } from "./liquidity-hub-confirmation-dialog";
import { useLiquidityHubInputError, useOptimalRate } from "./hooks";
import { SwapDetails } from "./swap-details";
import { useLiquidityHubQuote } from "./useLiquidityHubQuote";
import { useIsLiquidityHubTrade } from "./useIsLiquidityHubTrade";

function SwapPanel() {
  return (
    <div>
      <div className="flex flex-col gap-2 pt-2">
        <InTokenCard />
        <Switch />
        <OutTokenCard />
        <SwapDetails />
        <LiquidityHubConfirmationDialog />
        <ShowConfirmationButton />
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
      inputAmount: "",
    });
  }, [inToken, outToken, updateState]);

  return (
    <div className="h-0 relative z-10 flex items-center justify-center">
      <SwitchButton onClick={handleSwitch} />
    </div>
  );
};

const ShowConfirmationButton = () => {
  const account = useAccount().address;
  const openConnectModal = useConnectModal().openConnectModal;
  const { data: liquidityHubQuote } = useLiquidityHubQuote();
  const { data: optimalRate, isLoading: optimalRateLoading } = useOptimalRate();
  const inputError = useLiquidityHubInputError();
  const proceedWithLiquidityHub = useIsLiquidityHubTrade();

  const {
    state: { inputAmount },
    updateState,
  } = useLiquidityHubSwapContext();

  const onOpenConfirmation = useCallback(() => {
    updateState({ confirmationModalOpen: true, proceedWithLiquidityHub });
  }, [updateState, proceedWithLiquidityHub]);

  const { text, onClick } = useMemo(() => {
    if (!account) {
      return {
        text: "Connect wallet",
        onClick: openConnectModal,
      };
    }
    if (inputError === ErrorCodes.InsufficientBalance) {
      return {
        text: "Insufficient balance",
      };
    }
    if (inputError === ErrorCodes.EnterAmount) {
      return {
        text: "Enter amount",
      };
    }

    if (!optimalRate && inputAmount) {
      return {
        text: "Fetching rate...",
      };
    }

    return {
      text: "Swap",
      onClick: onOpenConfirmation,
    };
  }, [
    inputError,
    inputAmount,
    liquidityHubQuote,
    optimalRate,
    optimalRateLoading,
    openConnectModal,
    onOpenConfirmation,
  ]);

  return (
    <Button className="mt-2" size="lg" onClick={onClick} disabled={!onClick}>
      {text}
    </Button>
  );
};

const InTokenCard = () => {
  const {
    state: { inputAmount, inToken },
    updateState,
  } = useLiquidityHubSwapContext();
  const optimalRate = useOptimalRate().data;
  const onSelectToken = useCallback(
    (inToken: Token) => {
      updateState({ inToken });
    },
    [updateState]
  );

  const onValueChange = useCallback(
    (inputAmount: string) => {
      updateState({ inputAmount });
    },
    [updateState]
  );

  const inputError = useLiquidityHubInputError();

  return (
    <TokenCard
      label="Sell"
      amount={inputAmount}
      amountUsd={optimalRate?.srcUSD}
      selectedToken={inToken}
      onSelectToken={onSelectToken}
      onValueChange={onValueChange}
      inputError={inputError}
    />
  );
};

const OutTokenCard = () => {
  const { data: optimalRate, isLoading: optimalRateLoading } = useOptimalRate();
  const {
    state: { outToken },
    updateState,
  } = useLiquidityHubSwapContext();
  const destAmount = useToExactAmount(
    optimalRate?.destAmount,
    outToken?.decimals
  );

  const onSelectToken = useCallback(
    (outToken: Token) => {
      updateState({ outToken });
    },
    [updateState]
  );

  return (
    <TokenCard
      label="Buy"
      amount={destAmount ?? ""}
      amountUsd={optimalRate?.destUSD}
      selectedToken={outToken}
      onSelectToken={onSelectToken}
      isAmountEditable={false}
      amountLoading={optimalRateLoading}
    />
  );
};

export const SwapLiquidityHub = () => {
  return (
    <LiquidityHubSwapProvider>
      <SwapPanel />
    </LiquidityHubSwapProvider>
  );
};

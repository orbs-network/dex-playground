import { TokenCard } from "@/components/tokens/token-card";
import { SwitchButton } from "@/components/ui/switch-button";
import { useCallback, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { _TypedDataEncoder } from "@ethersproject/hash";
import { SwapStatus } from "@orbs-network/swap-ui";
import { Token } from "@/types";
import { ErrorCodes } from "@/lib";
import "../style.css";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import BN from "bignumber.js";
import {
  LiquidityHubSwapProvider,
  useLiquidityHubSwapContext,
} from "./context";
import { useToExactAmount } from "../hooks";
import { LiquidityHubConfirmationDialog } from "./liquidity-hub-confirmation-dialog";
import {
  useLiquidityHubInputError,
  useLiquidityHubQuote,
  useOptimalRate,
  useParaswapMinAmountOut,
} from "./hooks";
import { SwapDetails } from "./swap-details";

export const useIsLiquidityHubTrade = () => {
  const {
    state: { liquidityHubDisabled },
  } = useLiquidityHubSwapContext();
  const liquidityHubQuote = useLiquidityHubQuote().data;
  const paraswapMinAmountOut = useParaswapMinAmountOut();

  return useMemo(() => {
    // Choose between liquidity hub and dex swap based on the min amount out
    if (liquidityHubDisabled) return false;

    return BN(liquidityHubQuote?.minAmountOut || 0).gt(
      paraswapMinAmountOut || 0
    );
  }, [
    liquidityHubDisabled,
    liquidityHubQuote?.minAmountOut,
    paraswapMinAmountOut,
  ]);
};

function SwapPanel() {
  return (
    <div>
      <div className="flex flex-col gap-2 pt-2">
        <InTokenCard />
        <Switch />
        <OutTokenCard />
        <SwapDetails />
        <ConfirmationModal />
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

const ConfirmationModal = () => {
  const account = useAccount().address;
  const openConnectModal = useConnectModal().openConnectModal;
  const { data: liquidityHubQuote } = useLiquidityHubQuote();
  const { data: optimalRate, isLoading: optimalRateLoading } = useOptimalRate();
  const inputError = useLiquidityHubInputError();
  
  const isLiquidityHubTrade = useIsLiquidityHubTrade();
  const {
    state: { inputAmount },
    updateState,
    resetState,
  } = useLiquidityHubSwapContext();
  const [isOpen, setIsOpen] = useState(false);

  const { text, enabled } = useMemo(() => {
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
      enabled: true,
    };
  }, [
    inputError,
    inputAmount,
    liquidityHubQuote,
    optimalRate,
    optimalRateLoading,
  ]);

  const onOpen = useCallback(() => {
    setIsOpen(true);
    updateState({ isLiquidityHubTrade });
  }, [isLiquidityHubTrade]);

  const onClose = useCallback(
    (status?: SwapStatus) => {
      setIsOpen(false);
      updateState({ isLiquidityHubTrade: false });
      if (status === SwapStatus.SUCCESS) {
        updateState({ inputAmount: "" });
      }
    },
    [resetState]
  );

  if (!account) {
    return (
      <Button className="mt-2" size="lg" onClick={openConnectModal}>
        Connect wallet
      </Button>
    );
  }

  return (
    <>
      <LiquidityHubConfirmationDialog onClose={onClose} isOpen={isOpen} />
      <Button className="mt-2" size="lg" onClick={onOpen} disabled={!enabled}>
        {text}
      </Button>
    </>
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

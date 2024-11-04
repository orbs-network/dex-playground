import { TokenCard } from "@/components/tokens/token-card";
import { SwitchButton } from "@/components/ui/switch-button";
import { useCallback, useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { useTokenBalaces } from "@/lib";
import "../style.css";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { LimitPriceInput } from "./components/limit-price-input";
import {
  TwapContextProvider,
  useTwapContext,
  useTwapStateActions,
} from "./context";
import {
  useDerivedTwapSwapData,
  useInputLabels,
  useInTokenUsd,
  useMarketPrice,
  useOutTokenUsd,
  useTwapInputError,
} from "./hooks";
import { PriceToggle } from "./components/price-toggle";
import { useToExactAmount } from "../hooks";
import { TwapPanelInputs } from "./components/inputs";
import { TwapConfirmationDialog } from "./twap-confirmation-dialog";
import { SwapStatus } from "@orbs-network/swap-ui";
import { Orders } from "./orders/orders";

export function Panel() {
  const { refetch: refetchBalances } = useTokenBalaces();

  // Get wagmi account
  const account = useAccount();
  const { state } = useTwapContext();

  const {
    resetState,
    values: { inToken, outToken, typedAmount },
  } = state;

  const inputError = useTwapInputError();
  const { setInToken, setInputAmount, setOutToken, onSwitchTokens } =
    useTwapStateActions();
  const { destTokenAmount } = useDerivedTwapSwapData();
  const destAmount = useToExactAmount(destTokenAmount, outToken?.decimals);
  const [showSwapConfirmationModal, setShowSwapConfirmationModal] =
    useState(false);

  const { openConnectModal } = useConnectModal();

  const inAmountUsd = useInTokenUsd();
  const outAmountUsd = useOutTokenUsd();
  const marketPrice = useMarketPrice();
  const { inputLabel, outputLabel } = useInputLabels();

  const onCloseConfirmation = useCallback(
    (swapStatus?: SwapStatus) => {
      setShowSwapConfirmationModal(false);
      if (Boolean(swapStatus)) {
        resetState();
        refetchBalances();
      }
    },
    [resetState, refetchBalances]
  );

  const amountLoading = Boolean(inToken && !marketPrice);
  return (
    <div>
      <div className="flex flex-col gap-2 pt-2">
        <PriceToggle />
        <LimitPriceInput />
        <TokenCard
          label={inputLabel}
          amount={typedAmount}
          amountUsd={inAmountUsd}
          selectedToken={inToken}
          onSelectToken={setInToken}
          onValueChange={setInputAmount}
          inputError={inputError}
        />
        <div className="h-0 relative z-10 flex items-center justify-center">
          <SwitchButton onClick={onSwitchTokens} />
        </div>
        <TokenCard
          label={outputLabel}
          amount={destAmount ?? ""}
          amountUsd={outAmountUsd}
          selectedToken={outToken}
          onSelectToken={setOutToken}
          isAmountEditable={false}
          amountLoading={amountLoading}
        />
        <TwapPanelInputs />
        <TwapConfirmationDialog
          isOpen={showSwapConfirmationModal}
          onClose={onCloseConfirmation}
        />
        {!account.address ? (
          <Button className="mt-2" size="lg" onClick={openConnectModal}>
            Connect wallet
          </Button>
        ) : (
          <Button
            className="mt-2 w-full"
            onClick={() => setShowSwapConfirmationModal(true)}
            disabled={Boolean(inputError || !marketPrice || !typedAmount)}
          >
            {inputError || "Create order"}
          </Button>
        )}
      </div>
      <Orders />
    </div>
  );
}

export const SwapTwap = ({ isLimitPanel }: { isLimitPanel?: boolean }) => {
  return (
    <TwapContextProvider isLimitPanel={isLimitPanel}>
      <Panel />
    </TwapContextProvider>
  );
};


export const SwapLimit = () => {
  return <SwapTwap isLimitPanel={true} /> 
}
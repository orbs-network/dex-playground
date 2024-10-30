import { TokenCard } from "@/components/tokens/token-card";
import { SwitchButton } from "@/components/ui/switch-button";
import { useCallback, useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import {
  useDefaultTokens,
  useTokensWithBalances,
  useTokenBalance,
} from "@/lib";
import "../style.css";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { SettingsIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LimitPriceInput } from "./components/limit-price-input";
import {
  TwapContextProvider,
  useTwapContext,
  useTwapStateActions,
} from "./twap-context";
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
  const { tokensWithBalances, refetch: refetchBalances } =
    useTokensWithBalances();
  const [slippage, setSlippage] = useState(0.5);

  // Get wagmi account
  const account = useAccount();
  const { state } = useTwapContext();

  const {
    updateState,
    resetState,
    values: { inToken, outToken, typedAmount },
  } = state;

  // Set Initial Tokens
  const defaultTokens = useDefaultTokens({
    inToken,
    outToken,
    tokensWithBalances,
    setInToken: (token) => updateState({ inToken: token }),
    setOutToken: (token) => updateState({ outToken: token }),
  });

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
      <div className="flex justify-end">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon">
              <SettingsIcon className="w-5 h-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <div className="flex flex-col gap-4">
              <div className="flex gap-4 items-center justify-between">
                <Label htmlFor="slippage">Slippage</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="slippage"
                    type="number"
                    onChange={(e) => setSlippage(e.target.valueAsNumber)}
                    value={slippage}
                    step={0.1}
                    className="text-right w-16 [&::-webkit-inner-spin-button]:appearance-none p-2 h-7"
                  />
                  <div>%</div>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex flex-col gap-2 pt-2">
        <PriceToggle />
        <LimitPriceInput />
        <TokenCard
          label={inputLabel}
          amount={typedAmount}
          amountUsd={inAmountUsd}
          selectedToken={inToken || defaultTokens[0]}
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
          selectedToken={outToken || defaultTokens[1]}
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

export const Twap = ({ isLimitPanel }: { isLimitPanel?: boolean }) => {
  return (
    <TwapContextProvider isLimitPanel={isLimitPanel}>
      <Panel />
    </TwapContextProvider>
  );
};

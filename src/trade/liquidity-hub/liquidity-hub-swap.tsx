import { TokenCard } from "@/components/tokens/token-card";
import { SwitchButton } from "@/components/ui/switch-button";
import { useCallback, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { _TypedDataEncoder } from "@ethersproject/hash";
import { SwapStatus } from "@orbs-network/swap-ui";
import { Token } from "@/types";
import {
  ErrorCodes,
  format,
  getLiquidityProviderName,
  getMinAmountOut,
  getQuoteErrorMessage,
  toExactAmount,
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
import { DataDetails } from "@/components/ui/data-details";
import { Separator } from "@radix-ui/react-dropdown-menu";

export const useIsLiquidityHubTrade = () => {
  const {
    state: { liquidityHubDisabled },
  } = useLiquidityHubSwapContext();
  const liquidityHubQuote = useLiquidityHubQuote().data;
  const paraswapMinAmountOut = useParaswapMinAmountOut();

  console.log(liquidityHubQuote?.minAmountOut, paraswapMinAmountOut);

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
  const {
    state: { inToken, outToken },
    updateState,
  } = useLiquidityHubSwapContext();

  // Handle Token Switch
  const handleSwitch = useCallback(() => {
    updateState({
      inToken: outToken,
      outToken: inToken,
      inputAmount: "",
    });
  }, [inToken, outToken, updateState]);

  return (
    <div>
      <Settings />
      <div className="flex flex-col gap-2 pt-2">
        <InTokenCard />
        <div className="h-0 relative z-10 flex items-center justify-center">
          <SwitchButton onClick={handleSwitch} />
        </div>
        <OutTokenCard />
        <SwapDetails />
        <ConfirmationModal />
      </div>
    </div>
  );
}

const Settings = () => {
  const {
    state: { slippage },
    updateState,
  } = useLiquidityHubSwapContext();
  return (
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
                  onChange={(e) =>
                    updateState({ slippage: e.target.valueAsNumber })
                  }
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
    if (inputAmount && optimalRateLoading) {
      return {
        text: "Fetching quote...",
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
        updateState({inputAmount: ''});
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

export function SwapDetails() {
  const isLiquidityHubTrade = useIsLiquidityHubTrade();
  const optimalRate = useOptimalRate().data;
  const account = useAccount().address;
  const {
    state: { outToken, inToken },
  } = useLiquidityHubSwapContext();
  const minAmountOut = useParaswapMinAmountOut();
  const inPriceUsd = useMemo(() => {
    if (!optimalRate) return 0;
    const amount = toExactAmount(optimalRate.srcAmount, inToken?.decimals);
    return Number(optimalRate.srcUSD) / Number(amount);
  }, [optimalRate, inToken]);

  const minOutAmount = useToExactAmount(minAmountOut, outToken?.decimals);
  const outAmount = useToExactAmount(
    optimalRate?.destAmount,
    outToken?.decimals
  );

  const outPriceUsd = useMemo(() => {
    if (!optimalRate) return 0;
    const amount = toExactAmount(optimalRate.destAmount, outToken?.decimals);
    return Number(optimalRate.destUSD) / Number(amount);
  }, [optimalRate, outToken]);

  if (!inToken || !outToken || !account || !optimalRate) return null;

  const rate = inPriceUsd / outPriceUsd;

  let data: Record<string, React.ReactNode> = {
    Rate: `1 ${inToken.symbol} ≈ ${format.crypto(rate)} ${outToken.symbol}`,
  };

  data = {
    ...data,
    "Est. Received": `${format.crypto(Number(outAmount))} ${outToken.symbol}`,
    "Min. Received": `${format.crypto(Number(minOutAmount))} ${
      outToken.symbol
    }`,
    "Routing source": getLiquidityProviderName(isLiquidityHubTrade),
  };

  return (
    <div className="mt-4 flex flex-col gap-4">
      <DataDetails data={data} />
      <Separator />
      <div className="flex items-center justify-between gap-2">
        <div className="text-slate-300 text-sm">Recepient</div>
        <div className="text-slate-300">{format.address(account)}</div>
      </div>
    </div>
  );
}

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

export const Swap = () => {
  return (
    <LiquidityHubSwapProvider>
      <SwapPanel />
    </LiquidityHubSwapProvider>
  );
};

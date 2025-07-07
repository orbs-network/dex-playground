import { Button } from '@/components/ui/button';
import { SwapSteps } from '@/types';
import { SwapStep, SwapStatus } from '@orbs-network/swap-ui';
import { useCallback, useMemo } from 'react';
import { format, useTokenBalances } from '@/lib';
import { useOptimalRate, useParaswapApproval } from './hooks';
import { ConfirmationDialog, useSwapProgress } from '../confirmation-dialog';
import { useToExactAmount } from '../hooks';
import { Card } from '@/components/ui/card';
import { DataDetails } from '@/components/ui/data-details';
import { toExactAmount, usePriceUsd, useUsdAmount } from '@/lib';
import { useAccount } from 'wagmi';
import { useLiquidityHubApproval } from './hooks';
import { useLiquidityHubSwapCallback } from './useLiquidityHubSwapCallback';
import { useLiquidityHubQuote } from './useLiquidityHubQuote';
import { useParaswapSwapCallback } from './useParaswapSwapCallback';
import { Spinner } from '@/components/spinner';
import { useLiquidityHubSwapContext } from './context';


const useLiquidityHubSteps = (steps?: number[]) => {
  const {
    state: { inToken, signature },
  } = useLiquidityHubSwapContext();
  return useMemo((): SwapStep[] => {
    if (!steps || !inToken) return [];

    return steps.map((step) => {
      if (step === SwapSteps.Wrap) {
        return {
          id: SwapSteps.Wrap,
          title: `Wrap ${inToken.symbol}`,
          description: `Wrap ${inToken.symbol}`,
          image: inToken?.logoUrl,
        };
      }
      if (step === SwapSteps.Approve) {
        return {
          id: SwapSteps.Approve,
          title: `Approve ${inToken.symbol}`,
          description: `Approve ${inToken.symbol}`,
          image: inToken?.logoUrl,
        };
      }
      return {
        id: SwapSteps.Swap,
        title: `Sign and Swap ${inToken.symbol}`,
        description: `Swap ${inToken.symbol}`,
        image: inToken?.logoUrl,
        timeout: signature ? 60_000 : 40_000,
      };
    });
  }, [inToken, steps, signature]);
};

const useParaswapSteps = (steps?: number[]) => {
  const {
    state: { inToken },
  } = useLiquidityHubSwapContext();
  return useMemo((): SwapStep[] => {
    if (!steps || !inToken) return [];

    return steps.map((step) => {
      if (step === SwapSteps.Wrap) {
        return {
          id: SwapSteps.Wrap,
          title: `Wrap ${inToken.symbol}`,
          description: `Wrap ${inToken.symbol}`,
          image: inToken?.logoUrl,
        };
      }
      if (step === SwapSteps.Approve) {
        return {
          id: SwapSteps.Approve,
          title: `Approve ${inToken.symbol}`,
          description: `Approve ${inToken.symbol}`,
          image: inToken?.logoUrl,
        };
      }
      return {
        id: SwapSteps.Swap,
        title: `Swap ${inToken.symbol}`,
        description: `Swap ${inToken.symbol}`,
        image: inToken?.logoUrl,
      };
    });
  }, [inToken, steps]);
};

export function SwapConfirmationDialog({ isLoading }: { isLoading: boolean }) {
  const {
    state: { inputAmount, inToken, outToken, isLiquidityHubTrade, confirmationModalOpen },
    updateState,
  } = useLiquidityHubSwapContext();

  const { refetch: refetchBalances } = useTokenBalances();

  const {
    state: { steps, swapStatus, currentStep },
    resetState: reset,
    updateState: updateProgressState,
  } = useSwapProgress();

  const paraswapSteps = useParaswapSteps(steps);
  const liquidityHubSteps = useLiquidityHubSteps(steps);

  const onClose = useCallback(() => {
    updateState({
      confirmationModalOpen: false,
    });
    if (swapStatus === SwapStatus.SUCCESS) {
      updateState({ inputAmount: '' });
      refetchBalances();
    }
    setTimeout(() => {
      reset();
    }, 5_00);
  }, [swapStatus, reset, updateState, refetchBalances]);

  const outAmount = useOutAmount()

  const { approvalLoading: paraswapApprovalLoading } = useParaswapApproval();
  const { approvalLoading: LiquidityHubApprovalLoading } = useLiquidityHubApproval();
  const { mutate: onLiquidityHubSwap } = useLiquidityHubSwapCallback(updateProgressState);
  const { mutate: onParaswapSwap } = useParaswapSwapCallback(updateProgressState);
  const approvalLoading = isLiquidityHubTrade
    ? LiquidityHubApprovalLoading
    : paraswapApprovalLoading;

  const { srcUSD, destUSD } = useUSD();

  const onSwap = useCallback(() => {
    if (isLiquidityHubTrade) {
      onLiquidityHubSwap();
    } else {
      onParaswapSwap();
    }
  }, [isLiquidityHubTrade, onLiquidityHubSwap, onParaswapSwap]);

  return (
    <ConfirmationDialog
      outToken={outToken}
      inToken={inToken}
      inAmount={Number(inputAmount)}
      outAmount={Number(outAmount)}
      isOpen={confirmationModalOpen}
      onClose={onClose}
      swapStatus={swapStatus}
      mainContent={
        isLoading ? (
          <LoadingContent />
        ) : (
          <ConfirmationDialog.Main
            fromTitle="Sell"
            toTitle="Buy"
            steps={isLiquidityHubTrade ? liquidityHubSteps : paraswapSteps}
            inUsd={format.dollar(Number(srcUSD || '0'))}
            currentStep={currentStep}
            outUsd={format.dollar(Number(destUSD || '0'))}
            submitSwapButton={
              <SubmitSwapButton approvalLoading={!!approvalLoading} onClick={onSwap} />
            }
            details={isLiquidityHubTrade ? <LiquidityHubSwapDetails /> : <ParaswapDetails />}
          />
        )
      }
    />
  );
}

const useOutAmount = () => {
  const {state:{isLiquidityHubTrade, outToken}} =  useLiquidityHubSwapContext()
  const quote = useLiquidityHubQuote().data
  const optimalRate = useOptimalRate().data
  const amount = isLiquidityHubTrade ? quote?.referencePrice : optimalRate?.destAmount

  return useToExactAmount(amount, outToken?.decimals)

}

const LoadingContent = () => {
  return (
    <div className="flex items-center flex-col gap-6">
      <Spinner className="w-20 h-20" />
      <p style={{ fontSize: 18, fontWeight: 600 }}>Seeking better price</p>
    </div>
  );
};

const useUSD = () => {
  const {
    state: { inToken, outToken, inputAmount, isLiquidityHubTrade },
  } = useLiquidityHubSwapContext();
  const quote = useLiquidityHubQuote().data;
  const optimalRate = useOptimalRate().data;

  const lhAmountOutExact = useToExactAmount(quote?.referencePrice, outToken?.decimals);

  const lhSrcUsd = useUsdAmount(inToken?.address, inputAmount);
  const lhDestUsd = useUsdAmount(outToken?.address, lhAmountOutExact);
  const srcUSD = isLiquidityHubTrade ? lhSrcUsd : optimalRate?.srcUSD;
  const destUSD = isLiquidityHubTrade ? lhDestUsd : optimalRate?.destUSD;

  return useMemo(() => {
    return {
      srcUSD,
      destUSD,
    };
  }, [srcUSD, destUSD]);
};

const SubmitSwapButton = ({
  onClick,
  approvalLoading,
}: {
  onClick: () => void;
  approvalLoading: boolean;
}) => {
  const {
    state: { inToken, outToken },
  } = useLiquidityHubSwapContext();
  return (
    <Button disabled={approvalLoading} size="lg" onClick={onClick} className="w-full">
      Swap {inToken?.symbol} for {outToken?.symbol}
    </Button>
  );
};

const ParaswapDetails = () => {
  const optimalRate = useOptimalRate().data;
  const address = useAccount().address;
  const gasPrice = useMemo(() => {
    return Number(optimalRate?.gasCostUSD || '0');
  }, [optimalRate?.gasCostUSD]);

  return (
    <div className="w-full mt-4 mb-4 flex gap-2 flex-col">
      <Card className="bg-slate-900">
        <div className="p-4 flex flex-col gap-2">
          <DataDetails
            data={{
              Network: 'Polygon',
              'Network fee': format.dollar(gasPrice),
              'Routing source': 'Paraswap',
            }}
          />
        </div>
      </Card>
      <Card className="bg-slate-900">
        <div className="p-4">
          <DataDetails
            data={{
              Recipient: format.address(address || ''),
            }}
          />
        </div>
      </Card>
    </div>
  );
};

const LiquidityHubSwapDetails = () => {
  const quote = useLiquidityHubQuote().data;
  const address = useAccount().address;
  const {
    state: { outToken },
  } = useLiquidityHubSwapContext();
  const outTokenUsd = usePriceUsd(outToken?.address).data;

  const gasPrice = useMemo(() => {
    if (!outToken || !outTokenUsd) return 0;
    const gas = toExactAmount(quote?.gasAmountOut, outToken.decimals);

    return Number(gas) * outTokenUsd;
  }, [outToken, outTokenUsd, quote?.gasAmountOut]);

  return (
    <div className="w-full mt-4 mb-4 flex gap-2 flex-col">
      <Card className="bg-slate-900">
        <div className="p-4 flex flex-col gap-2">
          <DataDetails
            data={{
              Network: 'Polygon',
              'Network fee': format.dollar(gasPrice),
              'Routing source': 'Liquidity Hub',
            }}
          />
        </div>
      </Card>
      <Card className="bg-slate-900">
        <div className="p-4">
          <DataDetails
            data={{
              Recipient: format.address(address || ''),
            }}
          />
        </div>
      </Card>
    </div>
  );
};

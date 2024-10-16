import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Token } from "@/types";
import { SwapFlow, SwapStatus, SwapStep } from "@orbs-network/swap-ui";
import { createContext, ReactNode, useContext } from "react";
import { format } from "@/lib";
import { Skeleton } from "@/components/ui/skeleton";

export type Props = {
  inToken: Token | null;
  outToken: Token | null;
  inAmount?: number;
  outAmount?: number;
  errorContent?: React.ReactNode;
  mainContent?: React.ReactNode;
  successContent?: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  swapStatus?: SwapStatus;
};

interface ContextType extends Props {}

const ConfirmationContext = createContext({} as ContextType);

const useConfirmationContext = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error(
      "useConfirmationContext must be used within a ConfirmationProvider"
    );
  }
  return context;
};

export function SwapConfirmationDialogContent() {
  const {
    inToken,
    outToken,
    inAmount,
    outAmount,
    isOpen,
    onClose,
    mainContent,
    swapStatus,
  } = useConfirmationContext();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle>Swap</DialogTitle>
        <DialogDescription></DialogDescription>
        <div className="flex flex-col gap-4">
          <div className="p-4">
            <SwapFlow
              inAmount={format.crypto(inAmount || 0)}
              outAmount={format.crypto(outAmount || 0)}
              mainContent={mainContent}
              swapStatus={swapStatus}
              successContent={<SwapFlow.Success explorerUrl="/" />}
              failedContent={<SwapFlow.Failed />}
              inToken={{
                symbol: inToken?.symbol,
                logo: inToken?.logoUrl,
              }}
              outToken={{
                symbol: outToken?.symbol,
                logo: outToken?.logoUrl,
              }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export const SwapConfirmationDialog = (props: Props) => {
  return (
    <ConfirmationContext.Provider value={props}>
      <SwapConfirmationDialogContent />
    </ConfirmationContext.Provider>
  );
};

const Main = ({
  fromTitle,
  toTitle,
  steps,
  inUsd,
  outUsd,
  submitSwapButton,
  details,
  currentStep,
}: {
  fromTitle: string;
  toTitle: string;
  inUsd?: string;
  outUsd?: string;
  submitSwapButton: ReactNode;
  details?: ReactNode;
  steps: SwapStep[];
  currentStep?: number;
}) => {
  const { swapStatus } = useConfirmationContext();
  return (
    <>
      <SwapFlow.Main
        fromTitle={fromTitle}
        toTitle={toTitle}
        steps={steps}
        inUsd={inUsd}
        outUsd={outUsd}
        currentStep={currentStep}
      />
      {!swapStatus ? (
        <>
          {details}
          {submitSwapButton}
        </>
      ) : !steps ? (
        <StepsLoader />
      ) : null}
    </>
  );
};

const StepsLoader = () => {
  return (
    <div className="flex flex-row gap-4 w-full items-center">
      <Skeleton style={{ width: 30, height: 30, borderRadius: "50%" }} />
      <Skeleton style={{ width: "60%", height: 20, maxWidth: 200 }} />
    </div>
  );
};

SwapConfirmationDialog.Main = Main;

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
import { useCallback, useReducer } from "react";

export type Props = {
  inToken?: Token;
  outToken?: Token;
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

export function ConfirmationDialogContent() {
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
              outAmount={!outAmount ? undefined : format.crypto(outAmount || 0)}
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

export const ConfirmationDialog = (props: Props) => {
  return (
    <ConfirmationContext.Provider value={props}>
      <ConfirmationDialogContent />
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

ConfirmationDialog.Main = Main;



export type SwapProgressState = {
  swapStatus?: SwapStatus;
  currentStep?: number;
  shouldUnwrap?: boolean;
  txHash?: string;
  steps?: number[];
  error?: string;
};


type Action =
  | { type: "UPDATE_STATE"; payload: Partial<SwapProgressState> }
  | { type: "RESET" };

function reducer(
  state: SwapProgressState,
  action: Action,
  initialState: SwapProgressState
): SwapProgressState {
  switch (action.type) {
    case "UPDATE_STATE":
      return { ...state, ...action.payload };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

const initialState = {} as SwapProgressState;

export const useSwapProgress = () => {
  const [state, dispatch] = useReducer(
    (state: SwapProgressState, action: Action) => reducer(state, action, initialState),
    initialState
  );

  const updateState = useCallback(
    (payload: Partial<SwapProgressState>) => {
      dispatch({ type: "UPDATE_STATE", payload });
    },
    [dispatch]
  );

  const resetState = useCallback(() => {
    dispatch({ type: "RESET" });
  }, [dispatch]);

  return {
    state,
    updateState,
    resetState,
  };
};

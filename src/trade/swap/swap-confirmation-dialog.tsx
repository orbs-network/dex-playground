import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { onSubmitArgs, SwapSteps, Token } from "@/types";
import { SwapFlow, SwapStatus, SwapStep } from "@orbs-network/swap-ui";
import {
  createContext,
  FC,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from "react";
import { format } from "@/lib";

export type State = {
  swapStatus?: SwapStatus;
  currentStep?: number;
  shouldUnwrap?: boolean;
  txHash?: string;
  steps?: number[];
  error?: string;
  stapStatus?: SwapStatus;
};

export type Props = {
  inToken: Token | null;
  outToken: Token | null;
  inAmount?: number;
  inAmountUsd?: string;
  outAmount?: number;
  outAmountUsd?: string;
  errorContent?: React.ReactNode;
  mainContent?: React.ReactNode;
  successContent?: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
};

interface ContextType extends Props {
  state: State;
  updateState: (payload: Partial<State>) => void;
  resetState: () => void;
}

type Action =
  | { type: "UPDATE_STATE"; payload: Partial<State> }
  | { type: "RESET" };

function reducer<TState>(
  state: TState,
  action: Action,
  initialState: TState
): TState {
  switch (action.type) {
    case "UPDATE_STATE":
      return { ...state, ...action.payload };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

const initialState = {} as State;

const useConfirmationState = () => {
  const [state, dispatch] = useReducer(
    (state: State, action: Action) => reducer(state, action, initialState),
    initialState
  );

  const updateState = useCallback(
    (payload: Partial<State>) => {
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
    state,
    inAmountUsd,
    outAmountUsd,
    inAmount,
    outAmount,
    SubmitSwapButton,
    onSubmitSwap,
    isOpen,
    onClose,
    mainContent,
  } = useConfirmationContext();
  const { currentStep, swapStatus, steps } = state;

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
  const { state, updateState, resetState } = useConfirmationState();
  return (
    <ConfirmationContext.Provider
      value={{ state, updateState, resetState, ...props }}
    >
      <SwapConfirmationDialogContent />
    </ConfirmationContext.Provider>
  );
};

const Main = ({
  fromTitle,
  toTitle,
  parseSteps,
  inUsd,
  outUsd,
  SubmitSwapButton,
  onSubmitSwap,
}: {
  fromTitle: string;
  toTitle: string;
  parseSteps: (value?: SwapSteps[]) => SwapStep[] | undefined;
  inUsd?: string;
  outUsd?: string;
  SubmitSwapButton: FC<{ onClick: () => void }>;
  onSubmitSwap: (args: onSubmitArgs) => void;
}) => {
  const {
    state: { steps, currentStep, swapStatus },
    updateState,
  } = useConfirmationContext();
  const parsedSteps = useMemo(() => parseSteps(steps), [steps, parseSteps]);

  const onSubmit = useCallback(() => {
    onSubmitSwap({
      onStatus: (swapStatus?: SwapStatus) => updateState({ swapStatus }),
      onStepChange: (currentStep: number) => updateState({ currentStep }),
      onSteps: (steps: number[]) => updateState({ steps }),
    });
  }, [ onSubmitSwap, updateState]);

  return (
    <>
      <SwapFlow.Main
        fromTitle={fromTitle}
        toTitle={toTitle}
        steps={parsedSteps}
        inUsd={inUsd}
        outUsd={outUsd}
        currentStep={currentStep}
      />
      {!swapStatus && <SubmitSwapButton onClick={onSubmit} />}
    </>
  );
};

SwapConfirmationDialog.Main = Main;

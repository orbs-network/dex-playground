import { SwapStatus } from "@orbs-network/swap-ui";
import { useCallback, useReducer } from "react";

export type SwapState = {
  swapStatus?: SwapStatus;
  currentStep?: number;
  shouldUnwrap?: boolean;
  txHash?: string;
  steps?: number[];
  error?: string;
  stapStatus?: SwapStatus;
};


type Action =
  | { type: "UPDATE_STATE"; payload: Partial<SwapState> }
  | { type: "RESET" };

function reducer<SwapState>(
  state: SwapState,
  action: Action,
  initialState: SwapState
): SwapState {
  switch (action.type) {
    case "UPDATE_STATE":
      return { ...state, ...action.payload };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

const initialState = {} as SwapState;

export const useSwapState = () => {
  const [state, dispatch] = useReducer(
    (state: SwapState, action: Action) => reducer(state, action, initialState),
    initialState
  );

  const updateState = useCallback(
    (payload: Partial<SwapState>) => {
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

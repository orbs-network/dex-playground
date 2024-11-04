import { useDefaultTokens } from "@/lib";
import { Token } from "@/types";
import {
  constructSDK,
  LiquidityHubSDK,
  Quote,
} from "@orbs-network/liquidity-hub-sdk";
import {
  useContext,
  ReactNode,
  useReducer,
  useCallback,
  useMemo,
  createContext,
} from "react";
import { useAccount } from "wagmi";
import { useToRawAmount } from "../hooks";

const initialState: State = {
  inToken: null,
  outToken: null,
  inputAmount: "",
  acceptedQuote: undefined,
  liquidityHubDisabled: false,
  forceLiquidityHub: false,
  showConfirmation: false,
};

interface State {
  inToken: Token | null;
  outToken: Token | null;
  inputAmount: string;
  acceptedQuote: Quote | undefined;
  liquidityHubDisabled: boolean;
  forceLiquidityHub: boolean;
  showConfirmation: boolean;
  signature?: string;
  isLiquidityHubTrade?: boolean;
}

type Action = { type: "UPDATE"; payload: Partial<State> } | { type: "RESET" };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "UPDATE":
      return { ...state, ...action.payload };
    case "RESET":
      return initialState;
    default:
      return state;
  }
};

interface ContextType {
  state: State;
  updateState: (payload: Partial<State>) => void;
  resetState: () => void;
  sdk: LiquidityHubSDK;
  parsedInputAmount?: string;
}

const Context = createContext({} as ContextType);
export const useLiquidityHubSwapContext = () => {
  return useContext(Context);
};

export const LiquidityHubSwapProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [_state, dispatch] = useReducer(reducer, initialState);
  const defaultTokens = useDefaultTokens();

  const state = useMemo(() => {
    return {
      ..._state,
      inToken: _state.inToken || defaultTokens?.inToken  || null,
      outToken: _state.outToken || defaultTokens?.outToken || null,
    };
  }, [_state, defaultTokens]);

  const { chainId } = useAccount();

  const parsedInputAmount = useToRawAmount(
    state.inputAmount,
    state.inToken?.decimals
  );

  const updateState = useCallback(
    (payload: Partial<State>) => {
      dispatch({ type: "UPDATE", payload });
    },
    [dispatch]
  );

  const resetState = useCallback(() => {
    dispatch({ type: "RESET" });
  }, [dispatch]);

  const sdk = useMemo(
    () => constructSDK({ partner: "widget", chainId }),
    [chainId]
  );

  return (
    <Context.Provider
      value={{
        state,
        parsedInputAmount,
        updateState,
        resetState,
        sdk,
      }}
    >
      {children}
    </Context.Provider>
  );
};

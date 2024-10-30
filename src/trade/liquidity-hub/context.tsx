import { useDefaultTokens, useTokensWithBalances } from "@/lib";
import { Token } from "@/types";
import { constructSDK, LiquidityHubSDK, Quote } from "@orbs-network/liquidity-hub-sdk";
import { useContext, ReactNode, useReducer, useCallback, useMemo, createContext } from "react";
import { useAccount } from "wagmi";
import { useToRawAmount } from "../hooks";

const initialState: State = {
    inToken: null,
    outToken: null,
    inputAmount: "",
    acceptedQuote: undefined,
    liquidityHubDisabled: false,
    slippage: 0.5,
    forceLiquidityHub: false,
    showConfirmation: false,
  };
  
  interface State {
    inToken: Token | null;
    outToken: Token | null;
    inputAmount: string;
    acceptedQuote: Quote | undefined;
    liquidityHubDisabled: boolean;
    slippage: number;
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
  

  export const LiquidityHubSwapProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const { chainId } = useAccount();
    const { tokensWithBalances, refetch: refetchBalances } =
      useTokensWithBalances();
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
      refetchBalances();
    }, [dispatch, refetchBalances]);
  
    const sdk = useMemo(
      () => constructSDK({ partner: "widget", chainId }),
      [chainId]
    );
  
    useDefaultTokens({
      inToken: state.inToken,
      outToken: state.outToken,
      tokensWithBalances,
      setInToken: (token) => updateState({ inToken: token }),
      setOutToken: (token) => updateState({ outToken: token }),
    });
  
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
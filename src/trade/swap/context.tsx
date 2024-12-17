import { useDefaultTokens } from '@/lib';
import { Token } from '@/types';
import { constructSDK, LiquidityHubSDK } from '@orbs-network/liquidity-hub-sdk';
import { ReactNode, useReducer, useCallback, useMemo, createContext, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useToRawAmount } from '../hooks';

const initialState: State = {
  inToken: undefined,
  outToken: undefined,
  inputAmount: '',
  confirmationModalOpen: false,
  isLiquidityHubTrade: false,
};

interface State {
  inToken?: Token;
  outToken?: Token;
  inputAmount: string;
  signature?: string;
  confirmationModalOpen: boolean;
  isLiquidityHubTrade: boolean;
}

type Action = { type: 'UPDATE'; payload: Partial<State> } | { type: 'RESET' };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'UPDATE':
      return { ...state, ...action.payload };
    case 'RESET':
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

export const LiquidityHubContext = createContext({} as ContextType);

export const LiquidityHubSwapProvider = ({ children }: { children: ReactNode }) => {
  const [_state, dispatch] = useReducer(reducer, initialState);
  const defaultTokens = useDefaultTokens();
  const chainId = useAccount().chainId;

  const state = useMemo(() => {
    return {
      ..._state,
      inToken: _state.inToken || defaultTokens?.inToken,
      outToken: _state.outToken || defaultTokens?.outToken,
    };
  }, [_state, defaultTokens]);

  const parsedInputAmount = useToRawAmount(state.inputAmount, state.inToken?.decimals);

  const updateState = useCallback(
    (payload: Partial<State>) => {
      dispatch({ type: 'UPDATE', payload });
    },
    [dispatch]
  );

  const resetState = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, [dispatch]);

  useEffect(() => {
    if (chainId) {
      resetState();
    }
  }, [chainId, resetState]);

  const sdk = useMemo(() => constructSDK({ partner: 'widget', chainId }), [chainId]);


  return (
    <LiquidityHubContext.Provider
      value={{
        state,
        parsedInputAmount,
        updateState,
        resetState,
        sdk,
      }}
    >
      {children}
    </LiquidityHubContext.Provider>
  );
};

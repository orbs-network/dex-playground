/* eslint-disable react-refresh/only-export-components */

import { Token } from '@/types';
import { constructSDK, LiquidityHubSDK } from '@orbs-network/liquidity-hub-sdk';
import {
  ReactNode,
  useReducer,
  useCallback,
  useMemo,
  createContext,
  useEffect,
  useContext,
} from 'react';
import { useAccount } from 'wagmi';
import { useToRawAmount } from '../hooks';
import { eqIgnoreCase, useTokens } from '@/lib';
import { usePartner } from '@/store';

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
  onTokenSelect: (type: 'in' | 'out', token: Token) => void;
}

const LiquidityHubContext = createContext<ContextType>({} as ContextType);

export const useLiquidityHubSwapContext = () => {
  return useContext(LiquidityHubContext);
};

export const LiquidityHubSwapProvider = ({ children }: { children: ReactNode }) => {
  const [_state, dispatch] = useReducer(reducer, initialState);
  const { partner } = usePartner();
  const { tokens } = useTokens();
  const chainId = useAccount().chainId;

  const state = useMemo(() => {
    return {
      ..._state,
      inToken: _state.inToken || tokens?.[0],
      outToken: _state.outToken || tokens?.[1],
    };
  }, [_state, tokens]);

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

  const sdk = useMemo(() => constructSDK({ partner, chainId }), [partner, chainId]);

  const onTokenSelect = useCallback(
    (type: 'in' | 'out', token: Token) => {
      if (type === 'in') {
        updateState({
          inToken: token,
          outToken: eqIgnoreCase(token.address, state.outToken?.address)
            ? state.inToken
            : state.outToken,
        });
      } else {
        updateState({
          outToken: token,
          inToken: eqIgnoreCase(token.address, state.inToken?.address)
            ? state.outToken
            : state.inToken,
        });
      }
    },
    [updateState, state]
  );

  return (
    <LiquidityHubContext.Provider
      value={{
        state,
        parsedInputAmount,
        updateState,
        resetState,
        sdk,
        onTokenSelect,
      }}
    >
      {children}
    </LiquidityHubContext.Provider>
  );
};

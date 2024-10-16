import { Token } from "@/types";
import {
  Configs,
  constructSDK,
  TimeDuration,
  TwapSDK,
} from "@orbs-network/twap-sdk";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { useToRawAmount } from "../hooks";

interface Context {
  isLimitPanel: boolean;
  twapSDK: TwapSDK;
  state: ReturnType<typeof useTwapState>;
  isMarketOrder?: boolean;
  parsedInputAmount?: string;
  currentTime: number;
}
const context = createContext({} as Context);

type Action<TwapState> =
  | { type: "UPDATE_STATE"; payload: Partial<TwapState> }
  | { type: "RESET" };

function reducer<TwapState>(
  state: TwapState,
  action: Action<TwapState>,
  initialState: TwapState
): TwapState {
  switch (action.type) {
    case "UPDATE_STATE":
      return { ...state, ...action.payload };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

type TwapState = {
  typedAmount: string;
  customChunks?: number;
  customFillDelay: TimeDuration;
  customDuration: TimeDuration;
  customTradePrice?: string;
  inToken: Token | null;
  outToken: Token | null;
  isMarketOrder?: boolean;
  isTradePriceInverted?: boolean;
};

const initialState = {typedAmount: ''} as TwapState;

const useTwapState = () => {
  const [values, dispatch] = useReducer(
    (state: TwapState, action: Action<TwapState>) =>
      reducer(state, action, initialState),
    initialState
  );

  const updateState = useCallback(
    (payload: Partial<TwapState>) => {
      dispatch({ type: "UPDATE_STATE", payload });
    },
    [dispatch]
  );

  const resetState = useCallback(() => {
    dispatch({ type: "RESET" });
  }, [dispatch]);

  return {
    values,
    updateState,
    resetState,
  };
};

export const TwapContextProvider = ({
  children,
  isLimitPanel = false,
}: {
  children: ReactNode;
  isLimitPanel?: boolean;
}) => {
  const state = useTwapState();
  const [currentTime, setCurrentTime] = useState(Date.now());
  const twapSDK = useMemo(
    () => constructSDK({ config: Configs.QuickSwap }),
    []
  );

  useEffect(() => {
    setInterval(() => {
      setCurrentTime(Date.now());
    }, 60_000);
  }, []);

  return (
    <context.Provider
      value={{
        isLimitPanel,
        twapSDK,
        state,
        isMarketOrder: isLimitPanel ? false : state.values.isMarketOrder,
        parsedInputAmount: useToRawAmount(
          state.values.typedAmount,
          state.values.inToken?.decimals
        ),
        currentTime,
      }}
    >
      {children}
    </context.Provider>
  );
};

export const useTwapStateActions = () => {
  const {
    state: { updateState, values },
  } = useTwapContext();

  const { inToken, outToken } = values;

  const setOutToken = useCallback(
    (outToken: Token) => {
      updateState({ outToken, customTradePrice: undefined });
    },
    [updateState]
  );

  const setInToken = useCallback(
    (inToken: Token) => {
      updateState({ inToken, customTradePrice: undefined });
    },
    [updateState]
  );

  const setInputAmount = useCallback(
    (typedAmount: string) => {
      updateState({ typedAmount });
    },
    [updateState]
  );

  const onSwitchTokens = useCallback(() => {
    updateState({
      inToken: outToken,
      outToken: inToken,
      typedAmount: "",
      customTradePrice: undefined,
    });
  }, [inToken, outToken]);

  return {
    setOutToken,
    setInToken,
    setInputAmount,
    onSwitchTokens,
  };
};

export const useTwapContext = () => {
  return useContext(context);
};

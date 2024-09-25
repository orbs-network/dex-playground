import { createContext } from 'react'

import { Quote } from '@orbs-network/liquidity-hub-sdk'
import { useReducer } from 'react'
import { SwapStatus, Actions, State, Steps } from '../types'
import { Token } from '@/types'

const initialState: State = {
  steps: null,
  acceptedQuote: null,
  currentStep: null,
  inToken: null,
  outToken: null,
  status: SwapStatus.Idle,
}

function reducer(
  state: State,
  action: { type: Actions; payload?: Partial<State> }
): State {
  switch (action.type) {
    case Actions.Reset:
      return initialState
    case Actions.SetSteps:
    case Actions.SetCurrentStep:
    case Actions.BeginSwap:
    case Actions.UpdateStatus:
      return { ...state, ...action.payload }
    default:
      return state
  }
}

const useLiquidityHubState = () => {
  const [state, dispatch] = useReducer(reducer, initialState)

  const reset = () => dispatch({ type: Actions.Reset })

  const setCurrentStep = (step: Steps) =>
    dispatch({ type: Actions.SetCurrentStep, payload: { currentStep: step } })

  const setSteps = (steps: Steps[]) =>
    dispatch({ type: Actions.SetSteps, payload: { steps } })

  const beginSwap = (
    quote: Quote,
    inToken: Token,
    outToken: Token,
    steps: Steps[]
  ) =>
    dispatch({
      type: Actions.BeginSwap,
      payload: {
        acceptedQuote: quote,
        inToken,
        outToken,
        steps,
        currentStep: steps[0],
      },
    })

  const updateStatus = (status: SwapStatus) =>
    dispatch({ type: Actions.UpdateStatus, payload: { status } })

  return {
    state,
    reset,
    setCurrentStep,
    setSteps,
    beginSwap,
    updateStatus,
  }
}

type LiquidityHubContextValues = {
  state: State
  reset: () => void
  setCurrentStep: (step: Steps) => void
  beginSwap: (
    quote: Quote,
    inToken: Token,
    outToken: Token,
    steps: Steps[]
  ) => void
  setSteps: (steps: Steps[]) => void
  updateStatus: (status: SwapStatus) => void
}

export const LiquidityHubContext = createContext(
  {} as LiquidityHubContextValues
)

type LiquidityHubProviderProps = {
  children: React.ReactNode
}

export const LiquidityHubProvider = ({
  children,
}: LiquidityHubProviderProps) => {
  const store = useLiquidityHubState()

  return (
    <LiquidityHubContext.Provider value={store}>
      {children}
    </LiquidityHubContext.Provider>
  )
}

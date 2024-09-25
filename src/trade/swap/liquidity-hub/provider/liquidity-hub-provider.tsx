import { createContext } from 'react'
import {SwapStatus} from "@orbs-network/swap-ui"
import { useReducer } from 'react'
import { Actions, State, Steps } from '../types'

const initialState: State = {
  steps: null,
  currentStep: null,
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


  const updateStatus = (status: SwapStatus) =>
    dispatch({ type: Actions.UpdateStatus, payload: { status } })

  return {
    state,
    reset,
    setCurrentStep,
    setSteps,
    updateStatus,
  }
}

type LiquidityHubContextValues = {
  state: State
  reset: () => void
  setCurrentStep: (step: Steps) => void
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

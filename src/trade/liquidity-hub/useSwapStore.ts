import { Token } from '@/types'
import { Quote } from '@orbs-network/liquidity-hub-sdk'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export enum SwapStepId {
  Wrap = 'Wrap',
  Approve = 'Approve',
  Swap = 'Swap',
}

export enum SwapStepStatus {
  Idle = 'Idle',
  Loading = 'Loading',
  Complete = 'Complete',
  Error = 'Error',
}

export type SwapStepItem = {
  stepId: SwapStepId
  label: string
  status: SwapStepStatus
}

export type EnrichedQuote = Quote & {
  outToken: Token
  inToken: Token
}

type State = {
  steps: SwapStepItem[] | null
  quote: EnrichedQuote | null
  currentStepId: SwapStepId | null
}

type Actions = {
  reset: () => void
  beginSwap: (steps: SwapStepItem[], quote: EnrichedQuote | null) => void
  setCurrentStep: (stepId: SwapStepId) => void
  updateStatus: (stepId: SwapStepId, status: SwapStepStatus) => void
  appendCurrentStep: () => void
}

const initialStore: State = {
  steps: null,
  quote: null,
  currentStepId: null,
}

export const useSwapStore = create<
  State & Actions,
  [['zustand/persist', State]]
>(
  persist(
    (set) => ({
      ...initialStore,
      reset: () => set((state) => ({ ...state, ...initialStore })),
      beginSwap: (steps, quote) => {
        set({ steps, quote, currentStepId: steps[0].stepId })
      },
      setCurrentStep: (currentStepId) => set({ currentStepId }),
      updateStatus: (stepId, status) => {
        set((state) => {
          if (!state.steps) return state

          const index = state.steps.findIndex((s) => s.stepId === stepId)

          if (index === -1) return state

          const newSteps = state.steps.map((s, i) => {
            if (i === index) {
              return {
                ...s,
                status,
              }
            }

            return s
          })

          return {
            ...state,
            steps: newSteps,
          }
        })
      },
      appendCurrentStep: () => {
        set((state) => {
          if (!state.steps || !state.currentStepId) return state

          let currentIndex = -1
          let currentStep = null

          for (let i = 0; i < state.steps.length; i++) {
            if (state.steps[i].stepId === state.currentStepId) {
              currentIndex = i
              currentStep = state.steps[i]
              break
            }
          }

          if (!currentStep || currentIndex < 0) return state

          if (currentStep.status !== SwapStepStatus.Complete) return state

          const nextIndex = currentIndex + 1

          if (nextIndex >= state.steps.length) return state

          return {
            ...state,
            currentStepId: state.steps[nextIndex].stepId,
          }
        })
      },
    }),
    {
      name: 'orbs-swap-store',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)
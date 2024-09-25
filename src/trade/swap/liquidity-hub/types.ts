import { Token } from '@/types'
import { Quote } from '@orbs-network/liquidity-hub-sdk'

export enum Steps {
  Wrap = 'Wrap',
  Approve = 'Approve',
  Swap = 'Swap',
}

export enum SwapStatus {
  Idle = 'Idle',
  Loading = 'Loading',
  Success = 'Success',
  Failed = 'Failed',
}

export type State = {
  inToken: Token | null
  outToken: Token | null
  acceptedQuote: Quote | null
  steps: Steps[] | null
  currentStep: Steps | null
  status: SwapStatus
}

export enum Actions {
  Reset,
  SetSteps,
  SetCurrentStep,
  BeginSwap,
  UpdateStatus,
}

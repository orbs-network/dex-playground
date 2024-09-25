

export enum Steps {
  Wrap,
  Approve,
  Swap
}


export type State = {
  steps: Steps[] | null
  currentStep: Steps | null
}

export enum Actions {
  Reset,
  SetSteps,
  SetCurrentStep,
  BeginSwap,
  UpdateStatus,
}

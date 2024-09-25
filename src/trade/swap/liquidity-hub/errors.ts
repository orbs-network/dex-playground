export const enum ErrorCodes {
  InsufficientBalance = 'InsufficientBalance',
}

export function getSDKErrorMessage(errorCode: string) {
  switch (errorCode) {
    case 'ldv':
      return 'Minimum trade amount is $30'
    default:
      return 'An unknown error occurred'
  }
}

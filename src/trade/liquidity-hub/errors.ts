export const enum ErrorCodes {
  InsufficientBalance = 'InsufficientBalance',
}

export function getErrorMessage(errorCode: string) {
  switch (errorCode) {
    case 'ldv':
      return 'Minimum trade amount is $30'
    default:
      return 'An unknown error occurred'
  }
}

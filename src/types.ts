export type Token = {
  address: string
  symbol: string
  decimals: number
  logoUrl: string
  name?: string
}

export type TokenWithBalance = {
  token: Token
  balance: bigint
}

export type TokensWithBalances = Record<string, TokenWithBalance>

export enum SwapSteps {
  Wrap,
  Approve,
  Swap,
}

export type LiquidityProvider = 'paraswap' | 'liquidityhub'

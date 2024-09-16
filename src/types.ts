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

export type Address = `0x${string}`

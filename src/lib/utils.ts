import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import BN from 'bignumber.js'
import { networks, parsebn } from '@defi.org/web3-candies'
import { getApiUrl } from '@orbs-network/liquidity-hub-sdk-2'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const amountBN = (decimals?: number, amount?: string) =>
  parsebn(amount || '')
    .times(new BN(10).pow(decimals || 0))
    .decimalPlaces(0)

export const amountUi = (decimals?: number, amount?: BN | string) => {
  if (!amount) return ''
  const percision = new BN(10).pow(decimals || 0)
  return BN(amount).times(percision).idiv(percision).div(percision).toString()
}

export const dollar = Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export const crypto = Intl.NumberFormat('en-US', {
  style: 'decimal',
  minimumFractionDigits: 0,
  maximumFractionDigits: 5,
})

export const getChainConfig = (chainId?: number) => {
  if (!chainId) return undefined
  const result = Object.values(networks).find((it) => it.id === chainId)
  if (!result) return undefined
  const localStorageApiUrl = localStorage.getItem('apiUrl')
  return {
    ...result,
    apiUrl: localStorageApiUrl || getApiUrl(chainId),
  }
}

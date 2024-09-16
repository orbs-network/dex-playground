import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const toBigInt = (amount: string | number, decimals?: number) => {
  const num = Number(amount)
  return BigInt(num * 10 ** (decimals || 0))
}

export const toBigNumber = (amount: string | number, decimals?: number) => {
  return toBigInt(amount, decimals).toString()
}

export const fromBigNumber = (amount: bigint | string, decimals?: number) => {
  const numStr = typeof amount === 'bigint' ? amount.toString() : amount
  const precision = decimals || 0

  if (precision > 0) {
    const integerPart = numStr.slice(0, -precision) || '0'
    const fractionalPart = numStr.slice(-precision).padStart(precision, '0')

    return Number(`${integerPart}.${fractionalPart}`)
  } else {
    return Number(numStr)
  }
}

export const zeroAddress = '0x0000000000000000000000000000000000000000'

export const nativeTokenAddresses = [
  zeroAddress,
  '0x0000000000000000000000000000000000001010',
  '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  '0x000000000000000000000000000000000000dEaD',
  '0x000000000000000000000000000000000000800A',
]

export function eqIgnoreCase(a: string, b: string) {
  return a == b || a.toLowerCase() == b.toLowerCase()
}

export const isNativeAddress = (address: string) =>
  !!nativeTokenAddresses.find((a) => eqIgnoreCase(a, address))

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

export function formatAddress(address: string): string {
  return address.length >= 8
    ? `${address.slice(0, 4)}...${address.slice(-4)}`
    : address
}

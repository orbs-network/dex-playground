import { wagmiConfig } from '@/lib/wagmi-config'
import { getTransactionConfirmations } from 'wagmi/actions'

export async function promiseWithTimeout<T>(
  promise: Promise<T>,
  timeout: number
): Promise<T> {
  let timer: NodeJS.Timeout | null = null

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error('timeout'))
    }, timeout)
  })

  try {
    const result = await Promise.race([promise, timeoutPromise])
    if (timer) clearTimeout(timer)
    return result
  } catch (error) {
    if (timer) clearTimeout(timer)
    throw error
  }
}

export async function waitForConfirmations(
  txHash: `0x${string}`,
  maxConfirmations: number,
  maxTries: number
) {
  for (let i = 0; i < maxTries; i++) {
    const confirmations = await getTransactionConfirmations(wagmiConfig, {
      hash: txHash,
    })

    if (confirmations >= maxConfirmations) {
      break
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
}

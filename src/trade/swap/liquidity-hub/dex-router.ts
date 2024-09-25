import { isNativeAddress } from '@/lib/utils'
import { constructSimpleSDK, SwapSide } from '@paraswap/sdk'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useAccount } from 'wagmi'

const PARASWAP_NATIVE_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

export function useParaswap() {
  const { chainId } = useAccount()
  return useMemo(() => {
    const paraswapSDK = constructSimpleSDK({
      fetch: window.fetch,
      chainId: chainId || 1,
    })

    return paraswapSDK
  }, [chainId])
}

export const useDexRouter = ({
  inToken,
  outToken,
  inAmount,
}: {
  inToken?: string
  outToken?: string
  inAmount?: string
}) => {
  const paraswap = useParaswap()
  const { chainId } = useAccount()

  return useQuery({
    queryKey: ['paraswap-quote', inToken, outToken, inAmount, chainId],
    queryFn: async ({ signal }) => {
      return await paraswap.swap.getRate(
        {
          srcToken: isNativeAddress(inToken!)
            ? PARASWAP_NATIVE_ADDRESS
            : inToken!,
          destToken: isNativeAddress(outToken!)
            ? PARASWAP_NATIVE_ADDRESS
            : outToken!,
          amount: inAmount!,
          side: SwapSide.SELL,
        },
        signal
      )
    },
    enabled: !!inToken && !!outToken && Number(inAmount) > 0,
  })
}

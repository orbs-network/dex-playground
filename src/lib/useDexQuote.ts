import { useMemo } from 'react'
import { isNativeAddress } from '@/lib/utils'
import { constructSimpleSDK, SwapSide } from '@paraswap/sdk'
import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'

/* Gets quote from a common existing liquidity source to compare to Orbs Liquidity Hub */
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
export const useDexQuote = ({
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
      const dexQuote = await paraswap.swap.getRate(
        {
          srcToken: isNativeAddress(inToken!)
            ? PARASWAP_NATIVE_ADDRESS
            : inToken!,
          destToken: isNativeAddress(outToken!)
            ? PARASWAP_NATIVE_ADDRESS
            : outToken!,
          amount: inAmount!,
          side: SwapSide.SELL,
          options: {
            includeDEXS: [
              'quickswap',
              'quickswapv3',
              'quickswapv3.1',
              'quickperps',
            ],
            partner: 'quickswapv3',
          },
        },
        signal
      )

      return dexQuote
    },
    enabled: !!inToken && !!outToken && Number(inAmount) > 0,
    refetchInterval: 30_000,
  })
}

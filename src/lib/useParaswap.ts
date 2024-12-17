import { useCallback, useMemo } from 'react'
import {
  amountMinusSlippage,
  isNativeAddress,
} from '@/lib/utils'
import { constructSimpleSDK, OptimalRate, SwapSide } from '@paraswap/sdk'
import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { useAppState } from '@/store'


const PARASWAP_NATIVE_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

export function useParaswap() {
  const { chainId } = useAccount()
  return useMemo(() => {
    const paraswapSDK = constructSimpleSDK({
      fetch: window.fetch,
      chainId: chainId || 1,
      version: '5',
    })

    return paraswapSDK
  }, [chainId])
}

export const useParaswapQuote = ({
  inToken,
  outToken,
  inAmount,
  refetchInterval = 30_000,
}: {
  inToken?: string
  outToken?: string
  inAmount?: string
  refetchInterval?: number
}) => {
  const paraswap = useParaswap()
  const { chainId } = useAccount()
  const {isLiquidityHubOnly} = useAppState()

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
    enabled: !!inToken && !!outToken && Number(inAmount) > 0 && !isLiquidityHubOnly,
    refetchInterval,
    staleTime: Infinity,
  })
}

export const useParaswapBuildTxCallback = () => {
  const paraswap = useParaswap()
  const { address } = useAccount()
  return useCallback(
    async (optimalRate: OptimalRate, slippage: number) => {
      if (!address) {
        throw new Error('Wallet not connected')
      }

      const payload = {
        srcToken: optimalRate.srcToken,
        destToken: optimalRate.destToken,
        srcAmount: optimalRate.srcAmount,
        destAmount: amountMinusSlippage(slippage, optimalRate.destAmount)!,
        priceRoute: optimalRate,
        userAddress: address,
        receiver: address,
        // set your partner name here, we use quickswapv3 for example
        partner: 'quickswapv3',
      }

      return paraswap.swap.buildTx(payload)
    },
    [address, paraswap]
  )
}


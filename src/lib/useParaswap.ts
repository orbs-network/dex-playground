import { useCallback, useMemo } from 'react'
import { getMinAmountOut, isNativeAddress } from '@/lib/utils'
import { constructSimpleSDK, OptimalRate, SwapSide } from '@paraswap/sdk'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { wagmiConfig } from './wagmi-config'
import { estimateGas, sendTransaction } from 'wagmi/actions'
import { Address } from 'viem'
import { SwapStatus } from '@orbs-network/swap-ui'
import { SwapSteps } from '@/types'
import { approveAllowance } from './approveAllowance'

/* Gets quote from a common existing liquidity source to compare to Orbs Liquidity Hub */
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

export const useParaswapBuildTxCallback = () => {
  const paraswap = useParaswap()
  const account = useAccount().address as string
  return useCallback(
    async (optimalRate: OptimalRate, slippage: number) => {
      const payload = {
        srcToken: optimalRate.srcToken,
        destToken: optimalRate.destToken,
        srcAmount: optimalRate.srcAmount,
        destAmount: getMinAmountOut(slippage, optimalRate.destAmount)!,
        priceRoute: optimalRate,
        userAddress: account,
        // receiver: account,
        // set your partner name here, we use quickswapv3 for example
        partner: 'quickswapv3',
      }

      return paraswap.swap.buildTx(payload)
    },
    [account, paraswap]
  )
}

export const useParaswapSwapCallback = () => {
  const buildParaswapTxCallback = useParaswapBuildTxCallback()
  const account = useAccount().address as string

  return useMutation({
    mutationFn: async ({
      optimalRate,
      slippage,
      requiresApproval,
      setSwapStatus,
      setCurrentStep,
      onSuccess,
      onFailure,
    }: {
      optimalRate: OptimalRate
      slippage: number
      requiresApproval: boolean
      setSwapStatus: (status?: SwapStatus) => void
      setCurrentStep: (step: SwapSteps) => void
      onSuccess?: () => void
      onFailure?: () => void
    }) => {
      setSwapStatus(SwapStatus.LOADING)

      if (requiresApproval) {
        setCurrentStep(SwapSteps.Approve)
        await approveAllowance(
          account,
          optimalRate.srcToken,
          optimalRate.tokenTransferProxy as Address
        )
      }

      setCurrentStep(SwapSteps.Swap)

      let txPayload: unknown | null = null

      try {
        const txData = await buildParaswapTxCallback(optimalRate, slippage)

        txPayload = {
          account: txData.from as Address,
          to: txData.to as Address,
          data: txData.data as `0x${string}`,
          gasPrice: BigInt(txData.gasPrice),
          gas: txData.gas ? BigInt(txData.gas) : undefined,
          value: BigInt(txData.value),
        }
      } catch (error) {
        // Handle error in UI
        console.error(error)
        if (onFailure) onFailure()
        setSwapStatus(SwapStatus.FAILED)
      }

      if (!txPayload) {
        if (onFailure) onFailure()
        setSwapStatus(SwapStatus.FAILED)

        throw new Error('Failed to build transaction')
      }

      try {
        // Use estimate gas to simulate send transaction
        // if any error occurs, it will be caught and handled
        // without spending any gas
        await estimateGas(wagmiConfig, txPayload)

        const txHash = await sendTransaction(wagmiConfig, txPayload)

        if (onSuccess) onSuccess()

        setSwapStatus(SwapStatus.SUCCESS)

        return txHash
      } catch (error) {
        console.error(error)
        if (onFailure) onFailure()
        setSwapStatus(SwapStatus.FAILED)

        throw error
      }
    },
  })
}

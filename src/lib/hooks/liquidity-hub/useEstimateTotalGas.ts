import { networks } from '@/lib/networks'
import { isNativeAddress, fromBigNumber } from '@/lib/utils'
import { usePriceUSD } from '../balances/usePriceUsd'
import { useEstimateGasForWrapToken } from './useEstimateGasForWrapToken'
import { Quote } from '@orbs-network/liquidity-hub-sdk'
import { Token } from '@/types'
import { useEstimateGasForApproval } from './useEstimateGasForApproval'

type UseEstimateTotalGas = {
  account: string
  quote?: Quote
  srcToken: Token | null
  requiresApproval: boolean
}

export function useEstimateTotalGas({
  account,
  quote,
  srcToken,
  requiresApproval,
}: UseEstimateTotalGas) {
  const { data: nativePriceUsd } = usePriceUSD(
    137,
    networks.poly.native.address
  )

  const { data: gasForWrap } = useEstimateGasForWrapToken({
    account,
    value: BigInt(quote?.inAmount || '0'),
    enabled: Boolean(srcToken && isNativeAddress(srcToken.address)),
  })

  const { data: gasForApproval } = useEstimateGasForApproval({
    account,
    value: BigInt(quote?.inAmount || '0'),
    enabled: requiresApproval,
  })

  let gasFee = quote
    ? fromBigNumber(quote.gasAmountOut || '0', networks.poly.native.decimals)
    : 0

  if (gasForWrap) {
    gasFee += fromBigNumber(
      gasForWrap.estimatedGas || '0',
      networks.poly.native.decimals
    )
  }

  if (gasForApproval) {
    gasFee += fromBigNumber(
      gasForApproval.estimatedGas || '0',
      networks.poly.native.decimals
    )
  }

  const gasFeeUsd = gasFee * (nativePriceUsd || 0)

  return {
    totalGasFee: gasFee,
    totalGasFeeUsd: gasFeeUsd,
  }
}

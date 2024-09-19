import { networks } from '@/lib/networks'
import { isNativeAddress, fromBigNumber } from '@/lib/utils'
import { usePriceUSD } from '../balances/usePriceUsd'
import { useEstimateGasForWrapToken } from './useEstimateGasForWrapToken'
import { Quote } from '@orbs-network/liquidity-hub-sdk'
import { Token } from '@/types'

type UseEstimateTotalGas = {
  account: string
  quote?: Quote
  srcToken: Token | null
}

export function useEstimateTotalGas({
  account,
  quote,
  srcToken,
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

  let gasFee = quote
    ? fromBigNumber(quote.gasAmountOut || '0', networks.poly.native.decimals)
    : 0

  if (gasForWrap) {
    gasFee += fromBigNumber(
      gasForWrap.estimatedGas || '0',
      networks.poly.native.decimals
    )
  }

  const gasFeeUsd = gasFee * (nativePriceUsd || 0)

  return {
    totalGasFee: gasFee,
    totalGasFeeUsd: gasFeeUsd,
  }
}

import { DataDetails } from '@/components/ui/data-details'
import { Separator } from '@/components/ui/separator'
import { format, fromBigNumber, getLiquidityProviderName } from '@/lib'
import { LiquidityProvider, Token } from '@/types'
import { OptimalRate } from '@paraswap/sdk'
import { useMemo } from 'react'

export type SwapDetailsProps = {
  optimalRate?: OptimalRate
  inToken: Token | null
  outToken: Token | null
  account?: string
  minAmountOut?: string
  liquidityProvider: LiquidityProvider
}

export function SwapDetails({
  inToken,
  outToken,
  account,
  minAmountOut,
  optimalRate,
  liquidityProvider,
}: SwapDetailsProps) {
  const inPriceUsd = useMemo(() => {
    if (!optimalRate) return 0
    const amount = fromBigNumber(optimalRate.srcAmount, inToken?.decimals)
    return Number(optimalRate.srcUSD) / Number(amount)
  }, [optimalRate, inToken])

  const outPriceUsd = useMemo(() => {
    if (!optimalRate) return 0
    const amount = fromBigNumber(optimalRate.destAmount, outToken?.decimals)
    return Number(optimalRate.destUSD) / Number(amount)
  }, [optimalRate, outToken])

  if (!inToken || !outToken || !account || !optimalRate) return null

  const rate = inPriceUsd / outPriceUsd

  let data: Record<string, React.ReactNode> = {
    Rate: `1 ${inToken.symbol} ≈ ${format.crypto(rate)} ${outToken.symbol}`,
  }

  const minOutAmount = fromBigNumber(minAmountOut, outToken.decimals)
  const outAmount = fromBigNumber(optimalRate.destAmount, outToken.decimals)
  data = {
    ...data,
    'Est. Received': `${format.crypto(Number(outAmount))} ${outToken.symbol}`,
    'Min. Received': `${format.crypto(minOutAmount)} ${outToken.symbol}`,
    'Routing source': getLiquidityProviderName(liquidityProvider),
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <DataDetails data={data} />
      <Separator />
      <div className="flex items-center justify-between gap-2">
        <div className="text-slate-300 text-sm">Recepient</div>
        <div className="text-slate-300">{format.address(account)}</div>
      </div>
    </div>
  )
}

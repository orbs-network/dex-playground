import { DataDetails } from '@/components/ui/data-details'
import { Separator } from '@/components/ui/separator'
import { useEstimateTotalGas } from '@/trade/swap/liquidity-hub/gas/useEstimateTotalGas'
import { usePriceImpact } from '@/trade/swap/liquidity-hub/usePriceImpact'
import { format, fromBigNumber } from '@/lib/utils'
import { Token } from '@/types'
import { Quote } from '@orbs-network/liquidity-hub-sdk'
import { useGetRequiresApproval } from './liquidity-hub/swap-flow/getRequiresApproval'

export type SwapDetailsProps = {
  inToken: Token
  inPriceUsd: number
  outToken: Token
  outAmount: string
  inAmountUsd: string
  outAmountUsd: string
  quote: Quote
  outPriceUsd: number
  account: string
}

export function SwapDetails({
  inToken,
  inPriceUsd,
  outAmount,
  outAmountUsd,
  outToken,
  inAmountUsd,
  quote,
  outPriceUsd,
  account,
}: SwapDetailsProps) {
  const priceImpact = usePriceImpact({
    outAmountUsd,
    inAmountUsd,
  })

  const {requiresApproval} = useGetRequiresApproval(quote)

  const { totalGasFeeUsd } = useEstimateTotalGas({
    account,
    quote,
    inToken,
    requiresApproval,
  })

  const rate = inPriceUsd / outPriceUsd

  let data: Record<string, React.ReactNode> = {
    Rate: `1 ${inToken.symbol} ≈ ${format.crypto(rate)} ${outToken.symbol}`,
  }

  if (priceImpact) {
    data = {
      ...data,
      'Price Impact': `${priceImpact}%`,
    }
  }

  if (quote) {
    const minoutAmount = fromBigNumber(quote.minAmountOut, outToken.decimals)
    data = {
      ...data,
      'Est. Received': `${format.crypto(Number(outAmount))} ${outToken.symbol}`,
      'Min. Received': `${format.crypto(minoutAmount)} ${outToken.symbol}`,
    }

    data = {
      ...data,
      'Gas Fee':
        totalGasFeeUsd > 0.01 ? format.dollar(totalGasFeeUsd) : '< $0.01',
    }
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      <DataDetails data={data} />
      <Separator />
      <div className="flex items-center justify-between gap-2">
        <div className="text-slate-300 text-sm">Recepient</div>
        <div className="text-slate-300">{account}</div>
      </div>
    </div>
  )
}

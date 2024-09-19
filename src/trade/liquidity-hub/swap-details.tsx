import { DataDetails } from '@/components/ui/data-details'
import { Separator } from '@/components/ui/separator'
import { useEstimateTotalGas } from '@/lib/hooks/liquidity-hub/useEstimateTotalGas'
import { usePriceImpact } from '@/lib/hooks/liquidity-hub/usePriceImpact'
import { useRequiresApproval } from '@/lib/hooks/liquidity-hub/useRequiresApproval'
import { format, fromBigNumber } from '@/lib/utils'
import { Token } from '@/types'
import { Quote } from '@orbs-network/liquidity-hub-sdk'

export type SwapDetailsProps = {
  srcToken: Token
  srcPriceUsd: number
  dstToken: Token
  dstAmount: string
  srcAmountUsd: string
  dstAmountUsd: string
  quote: Quote
  dstPriceUsd: number
  account: string
  srcAmount: string
}

export function SwapDetails({
  srcToken,
  srcPriceUsd,
  dstAmount,
  dstAmountUsd,
  dstToken,
  srcAmountUsd,
  quote,
  dstPriceUsd,
  account,
  srcAmount,
}: SwapDetailsProps) {
  const priceImpact = usePriceImpact({
    dstAmountUsd,
    srcAmountUsd,
  })

  const { data: requiresApproval } = useRequiresApproval({
    account,
    tokenAddress: srcToken?.address || '',
    srcToken,
    srcAmount: Number(srcAmount),
  })

  const { totalGasFeeUsd } = useEstimateTotalGas({
    account,
    quote,
    srcToken,
    requiresApproval,
  })

  const rate = srcPriceUsd / dstPriceUsd

  let data: Record<string, React.ReactNode> = {
    Rate: `1 ${srcToken.symbol} ≈ ${format.crypto(rate)} ${dstToken.symbol}`,
  }

  if (priceImpact) {
    data = {
      ...data,
      'Price Impact': `${priceImpact}%`,
    }
  }

  if (quote) {
    const minDstAmount = fromBigNumber(quote.minAmountOut, dstToken.decimals)
    data = {
      ...data,
      'Est. Received': `${format.crypto(Number(dstAmount))} ${dstToken.symbol}`,
      'Min. Received': `${format.crypto(minDstAmount)} ${dstToken.symbol}`,
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

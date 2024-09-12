import { DataDetails } from '@/components/ui/data-details'
import { Separator } from '@/components/ui/separator'
import { usePriceImpact } from '@/lib/hooks/liquidity-hub/usePriceImpact'
import { amountUi, dollar, crypto } from '@/lib/utils'
import { Token } from '@/types'
import { Quote } from '@orbs-network/liquidity-hub-sdk-2'
import BN from 'bignumber.js'

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
}: SwapDetailsProps) {
  const priceImpact = usePriceImpact({
    dstAmountUsd,
    srcAmountUsd,
  })

  const rate = BN(srcPriceUsd).dividedBy(dstPriceUsd).toNumber()

  let data: Record<string, React.ReactNode> = {
    Rate: `1 ${srcToken.symbol} = ${crypto.format(rate)} ${dstToken.symbol}`,
  }

  if (priceImpact) {
    data = {
      ...data,
      'Price Impact': `${priceImpact}%`,
    }
  }

  if (quote) {
    const minDstAmount = amountUi(dstToken.decimals, quote.minAmountOut)
    data = {
      ...data,
      'Est. Received': `${dstAmount} ${dstToken.symbol}`,
      'Min. Received': `${minDstAmount} ${dstToken.symbol}`,
    }

    const gasFee = amountUi(dstToken.decimals, quote.gasAmountOut)
    const gasFeeUsd = BN(gasFee || 0)
      .times(dstPriceUsd || 0)
      .toNumber()
    data = {
      ...data,
      'Gas Fee': `${gasFee} ${dstToken.symbol} (${dollar.format(gasFeeUsd)})`,
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

import { DataDetails } from '@/components/ui/data-details'
import { Separator } from '@/components/ui/separator'
import { format, fromBigNumber, toAmountUi } from '@/lib'
import { Token } from '@/types'

export type SwapDetailsProps = {
  inToken: Token | null
  inPriceUsd?: number
  outToken: Token | null
  outAmount: string
  minAmountOut?: string
  outPriceUsd?: number
  account?: string
}

export function SwapDetails({
  inToken,
  inPriceUsd,
  outAmount,
  outToken,
  minAmountOut,
  outPriceUsd,
  account,
}: SwapDetailsProps) {
  if (
    !inToken ||
    !outToken ||
    !inPriceUsd ||
    !outPriceUsd ||
    !account
  )
    return null

  const rate = inPriceUsd / outPriceUsd

  let data: Record<string, React.ReactNode> = {
    Rate: `1 ${inToken.symbol} ≈ ${format.crypto(rate)} ${outToken.symbol}`,
  }

  const minOutAmount = toAmountUi(minAmountOut, outToken.decimals)
  data = {
    ...data,
    'Est. Received': `${format.crypto(Number(outAmount))} ${outToken.symbol}`,
    'Min. Received': `${format.crypto(Number(minOutAmount))} ${outToken.symbol}`,
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

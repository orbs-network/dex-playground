import { WalletIcon } from 'lucide-react'
import { Card } from '../ui/card'
import { TokenSelect } from './token-select'
import { Token, TokensWithBalances } from '@/types'
import { NumericFormat } from 'react-number-format'
import { dollar, crypto } from '@/lib/utils'
import { Skeleton } from '../ui/skeleton'

export type TokenCardProps = {
  label: string
  amount: string
  amountUsd: string
  balance: string
  selectedToken: Token
  tokens: TokensWithBalances
  onSelectToken: (token: Token) => void
  isAmountEditable?: boolean
  onValueChange?: (value: string) => void
  amountLoading?: boolean
}

export function TokenCard({
  label,
  amount,
  amountUsd,
  balance,
  selectedToken,
  tokens,
  onSelectToken,
  onValueChange,
  isAmountEditable = true,
  amountLoading,
}: TokenCardProps) {
  return (
    <Card className="bg-slate-50 dark:bg-slate-900 p-4 flex flex-col gap-4">
      <h2 className="text-gray-500 dark:text-gray-400">{label}</h2>
      <div className="flex justify-between items-center">
        <div className="text-4xl">
          {amountLoading ? (
            <Skeleton className="h-10 w-[250px]" />
          ) : (
            <NumericFormat
              className="bg-transparent w-full min-w-0 outline-none"
              value={amount}
              placeholder="0.00"
              contentEditable={isAmountEditable}
              readOnly={!isAmountEditable}
              onValueChange={({ value }) => {
                if (!onValueChange) return

                onValueChange(value)
              }}
            />
          )}
        </div>
        <div>
          <TokenSelect
            selectedToken={selectedToken}
            tokens={tokens}
            onSelectToken={onSelectToken}
          />
        </div>
      </div>
      <div className="flex justify-between items-center">
        <div className="text-gray-500 dark:text-gray-400 text-lg">
          {dollar.format(Number(amountUsd))}
        </div>
        <div className="flex gap-2 items-center text-gray-500 dark:text-gray-400 text-lg">
          <WalletIcon className="h-5 w-5" />
          <div>{crypto.format(Number(balance))}</div>
        </div>
      </div>
    </Card>
  )
}

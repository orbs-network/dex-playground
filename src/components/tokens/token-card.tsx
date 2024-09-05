import { WalletIcon } from 'lucide-react'
import { Card } from '../ui/card'
import { TokenSelect } from './token-select'
import { Token } from '@/types'

export type TokenCardProps = {
  label: string
  amount: string
  amountUsd: string
  balance: string
  selectedToken: Token
  tokens: Token[]
  onSelectToken: (token: Token) => void
}

export function TokenCard({
  label,
  amount,
  amountUsd,
  balance,
  selectedToken,
  tokens,
  onSelectToken,
}: TokenCardProps) {
  return (
    <Card className="bg-slate-50 dark:bg-slate-900 p-4 flex flex-col gap-4">
      <h2 className="text-gray-500 dark:text-gray-400">{label}</h2>
      <div className="flex justify-between items-center">
        <div className="text-4xl">{amount}</div>
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
          ${amountUsd}
        </div>
        <div className="flex gap-2 items-center text-gray-500 dark:text-gray-400 text-lg">
          <WalletIcon className="h-5 w-5" />
          <div>{balance}</div>
        </div>
      </div>
    </Card>
  )
}

import { WalletIcon } from 'lucide-react'
import { Card } from '../ui/card'
import { TokenSelect } from './token-select'
import { Token, TokensWithBalances } from '@/types'
import { NumericFormat } from 'react-number-format'
import {
  format,
  cn,
  ErrorCodes,
  fromBigNumber,
  fromBigNumberToStr,
} from '@/lib'
import { Skeleton } from '../ui/skeleton'
import { Button } from '../ui/button'

function getTextSize(amountLength: number) {
  if (amountLength > 16) {
    return 'text-xl'
  }

  if (amountLength > 12 && amountLength <= 16) {
    return 'text-2xl'
  }

  return 'text-4xl'
}

export type TokenCardProps = {
  label: string
  amount: string
  amountUsd?: string
  balance: bigint
  selectedToken: Token
  tokens: TokensWithBalances
  onSelectToken: (token: Token) => void
  isAmountEditable?: boolean
  onValueChange?: (value: string) => void
  amountLoading?: boolean
  inputError?: string | null
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
  inputError,
}: TokenCardProps) {
  const balanceDisplay = selectedToken
    ? format.crypto(fromBigNumber(balance, selectedToken.decimals))
    : '0'
  const halfBalance =
    balance !== 0n && selectedToken
      ? fromBigNumberToStr(balance / 2n, selectedToken.decimals)
      : '0'
  const maxBalance = selectedToken
    ? fromBigNumberToStr(balance, selectedToken.decimals)
    : '0'

  return (
    <Card
      className={cn(
        'bg-slate-50 dark:bg-slate-900 p-4 flex flex-col gap-4',
        inputError &&
          'mix-blend-multiply bg-red-50 dark:mix-blend-screen dark:bg-red-950'
      )}
    >
      <div className="flex justify-between items-center">
        <h2 className="text-gray-500 dark:text-gray-400">{label}</h2>
        {isAmountEditable && (
          <div className="flex items-center">
            <Button
              onClick={() => onValueChange && onValueChange(halfBalance)}
              size="sm"
              variant="link"
              className="text-xs"
            >
              50%
            </Button>

            <Button
              onClick={() => onValueChange && onValueChange(maxBalance)}
              size="sm"
              variant="link"
              className="text-xs"
            >
              MAX
            </Button>
          </div>
        )}
      </div>
      <div className="flex justify-between items-center">
        {amountLoading ? (
          <Skeleton className="h-10 w-[250px]" />
        ) : (
          <div className={cn(getTextSize(amount.length), 'w-full')}>
            <NumericFormat
              className="bg-transparent w-full min-w-0 outline-none"
              value={amount}
              placeholder="0.00"
              contentEditable={isAmountEditable}
              readOnly={!isAmountEditable}
              thousandSeparator={true}
              onValueChange={({ value }) =>
                onValueChange && onValueChange(value)
              }
            />
          </div>
        )}
        <div>
          <TokenSelect
            selectedToken={selectedToken}
            tokens={tokens}
            onSelectToken={onSelectToken}
          />
        </div>
      </div>
      <div className="flex justify-between items-center">
        {inputError ? (
          <div className="text-red-700 dark:text-red-600 text-lg">
            {inputError === ErrorCodes.InsufficientBalance
              ? 'Exceeds balance'
              : inputError}
          </div>
        ) : (
          <div className="text-gray-500 dark:text-gray-400 text-lg">
            {format.dollar(Number(amountUsd || '0'))}
          </div>
        )}
        <div className="flex gap-2 items-center text-gray-500 dark:text-gray-400 text-lg">
          <WalletIcon className="h-5 w-5" />
          <div>{balanceDisplay}</div>
        </div>
      </div>
    </Card>
  )
}

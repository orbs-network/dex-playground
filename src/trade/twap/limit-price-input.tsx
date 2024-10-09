import { Token } from '@/types'
import { NumericFormat } from 'react-number-format'
import { cn, format, networks, usePriceUsd, useTokensWithBalances } from '@/lib'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TokenSelect } from '@/components/tokens/token-select'
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import BN from 'bignumber.js'
import { ArrowUpDown, X } from 'lucide-react'
import { Avatar, AvatarImage } from '@/components/ui/avatar'

export type Props = {
  inToken?: Token | null
  outToken?: Token | null
  customLimitPrice?: string
  marketPrice?: string
  setOutToken: (token: Token) => void
  setInToken: (token: Token) => void
  onValueChange: (value?: string) => void
  amountLoading?: boolean
  limitInverted: boolean
  setLimitInverted: (inverted: boolean) => void
}

const options = [1, 5, 10]
export function LimitPriceInput(props: Props) {
  const tokens = useTokensWithBalances().tokensWithBalances
  const { limitInverted, setLimitInverted } = props
  const [percent, setPercent] = useState<number | undefined>(undefined)
  const inToken = limitInverted ? props.outToken : props.inToken
  const outToken = limitInverted ? props.inToken : props.outToken

  const selectedToken = outToken

  const onSelect = useCallback(
    (token: Token) => {
      if (!limitInverted) {
        props.setOutToken(token)
      } else {
        props.setInToken(token)
      }
    },
    [limitInverted, props]
  )

  useEffect(() => {
    props.onValueChange(undefined)
  }, [inToken?.address, outToken?.address, props])

  useEffect(() => {
    if (!props.customLimitPrice) {
      setPercent(undefined)
    }
  }, [props.customLimitPrice])

  const marketPrice = useMemo(() => {
    if (!props.marketPrice || BN(props.marketPrice).isZero()) return
    return limitInverted
      ? BN(1).div(props.marketPrice).toFixed(5)
      : props.marketPrice
  }, [props.marketPrice, limitInverted])

  const amount = useMemo(() => {
    if (props.customLimitPrice !== undefined) {
      return props.customLimitPrice
    }
    return marketPrice
  }, [props.customLimitPrice, marketPrice])

  const onInvert = useCallback(() => {
    setLimitInverted(!limitInverted)
    props.onValueChange(undefined)
  }, [setLimitInverted, limitInverted, props])

  const onPercent = useCallback(
    (percent?: number) => {
      if (percent == null) {
        props.onValueChange(undefined)
        setPercent(undefined)
        return
      }
      percent = limitInverted ? percent * -1 : percent
      setPercent(percent)

      const p = BN(percent).div(100).plus(1).toNumber()

      const updatedValue = BN(marketPrice || 0)
        .times(p)
        .toString()

      props.onValueChange(updatedValue)
    },
    [limitInverted, marketPrice, props]
  )

  const usd = usePriceUsd(networks.poly.id, selectedToken?.address).data
  const amountUsd = Number(amount || 0) * (usd || 0)

  const limitMarketPriceDiff = useMemo(() => {
    if (!props.customLimitPrice || !marketPrice) return
    return BN(
      BN(props.customLimitPrice)
        .dividedBy(marketPrice)
        .minus(1)
        .multipliedBy(100)
        .toFixed(2)
    ).toNumber()
  }, [props.customLimitPrice, marketPrice])

  return (
    <Card
      className={cn('bg-slate-50 dark:bg-slate-900 p-4 flex flex-col gap-4')}
    >
      <div className="flex justify-between items-center">
        <div className="flex flex-row gap-1 items-center">
          <h2 className="text-gray-500 dark:text-gray-400"> when 1 </h2>
          <Avatar className="w-5 h-5">
            <AvatarImage src={inToken?.logoUrl} alt={inToken?.symbol} />
          </Avatar>{' '}
          <h2 className="text-gray-500 dark:text-gray-400">
            {' '}
            {inToken?.symbol} is worth
          </h2>
        </div>

        <ArrowUpDown onClick={onInvert} className="w-5 h-5 cursor-pointer" />
      </div>
      <div className="flex justify-between items-center">
        <div className="text-4xl">
          {props.amountLoading ? (
            <Skeleton className="h-10 w-[250px]" />
          ) : (
            <NumericFormat
              className="bg-transparent w-full min-w-0 outline-none"
              value={amount}
              placeholder="0.00"
              allowNegative={false}
              thousandSeparator={true}
              onValueChange={(values, sourceInfo) => {
                if (sourceInfo.source !== 'event') return
                props.onValueChange(values.value)
              }}
            />
          )}
        </div>

        {selectedToken && (
          <div className="flex flex-col gap-3">
            <TokenSelect
              selectedToken={selectedToken}
              tokens={tokens || {}}
              onSelectToken={onSelect}
            />
          </div>
        )}
      </div>
      <div className="flex flex-row">
        <div className="text-gray-500 dark:text-gray-400 text-lg">
          {format.dollar(Number(amountUsd))}
        </div>
        <PercentageButtons
          limitInverted={limitInverted}
          selected={percent}
          onSelect={onPercent}
          diff={limitMarketPriceDiff}
        />
      </div>
    </Card>
  )
}

const PercentageButtons = ({
  onSelect,
  selected,
  diff,
  limitInverted,
}: {
  onSelect: (value?: number) => void
  selected?: number
  limitInverted: boolean
  diff?: number
}) => {
  return (
    <div className="flex items-center gap-2 ml-auto">
      <ResetButton
        diff={diff}
        selected={!selected}
        onReset={() => onSelect(undefined)}
      />
      {options.map((option) => {
        const prefix = limitInverted ? '-' : '+'
        return (
          <PercentButton
            onSelect={() => onSelect(option)}
            key={option}
            selected={selected === option}
          >{`${prefix}${option}%`}</PercentButton>
        )
      })}
    </div>
  )
}

const PercentButton = ({
  children,
  onSelect,
  selected,
  className = '',
}: {
  children: ReactNode
  onSelect: () => void
  selected: boolean
  className?: string
}) => {
  return (
    <Button
      onClick={onSelect}
      size="sm"
      className={`text-xs bg-black pl-2 pr-2 pt-0 pb-0  h-7 ${
        selected ? 'bg-primary' : ''
      } ${className}`}
    >
      {children}
    </Button>
  )
}

const ResetButton = ({
  onReset,
  selected,
  diff = 0,
}: {
  onReset: () => void
  selected: boolean
  diff?: number
}) => {
  const prefix = (diff || 0) > 0 ? '+' : ''
  return (
    <PercentButton onSelect={onReset} selected={selected}>
      {diff ? (
        <div className="flex flex-row gap-1 h-full items-center">
          {`${prefix}${diff}%`}{' '}
          <div className="h-full bg-slate-900 w-0.5"></div> <X size={14} />{' '}
        </div>
      ) : (
        '0%'
      )}
    </PercentButton>
  )
}
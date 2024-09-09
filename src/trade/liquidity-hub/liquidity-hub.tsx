import { Spinner } from '@/components/spinner'
import { TokenCard } from '@/components/tokens/token-card'
import { useTokensList } from '@/components/tokens/useTokenList'
import { SwitchButton } from '@/components/ui/switch-button'
import { Token } from '@/types'
import { useCallback, useEffect, useState } from 'react'

export function LiquidityHub() {
  const { data: tokens, isLoading } = useTokensList({ chainId: 137 })
  const [fromToken, setFromToken] = useState<Token | null>(null)
  const [toToken, setToToken] = useState<Token | null>(null)

  const handleSwitch = useCallback(() => {
    setFromToken(toToken)
    setToToken(fromToken)
  }, [fromToken, toToken])

  useEffect(() => {
    if (!fromToken && tokens) {
      setFromToken(tokens[0])
    }

    if (!toToken && tokens) {
      setToToken(tokens[1])
    }
  }, [fromToken, toToken, tokens])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center mt-28">
        <Spinner />
      </div>
    )
  }

  if (!tokens) {
    return (
      <div className="flex justify-center items-center p-6">
        <div className="text-red-600">Failed to load tokens</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 pt-2">
      <TokenCard
        label="Sell"
        amount="0.00"
        amountUsd="0.00"
        balance="0.00"
        selectedToken={fromToken || tokens[0]}
        tokens={tokens}
        onSelectToken={setFromToken}
      />
      <div className="h-0 relative z-10 flex items-center justify-center">
        <SwitchButton onClick={handleSwitch} />
      </div>
      <TokenCard
        label="Buy"
        amount="0.00"
        amountUsd="0.00"
        balance="0.00"
        selectedToken={
          toToken || tokens.find((t) => t.symbol === 'USDC') || tokens[1]
        }
        tokens={tokens}
        onSelectToken={setToToken}
      />
    </div>
  )
}

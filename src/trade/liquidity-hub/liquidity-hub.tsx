import { Spinner } from '@/components/spinner'
import { TokenCard } from '@/components/tokens/token-card'
import { SwitchButton } from '@/components/ui/switch-button'
import { Token } from '@/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import BN from 'bignumber.js'
import { useTokensWithBalances } from '@/lib/hooks/tokens/useTokensWithBalances'
import { zeroAddress } from 'viem'
import { usePriceUSD } from '@/lib/hooks/balances/usePriceUsd'
import { useAccount } from 'wagmi'
import { useQuote } from '@/lib/hooks/liquidity-hub/useQuote'
import { useDebounce } from '@/lib/hooks/utils'
import { amountBN, amountUi, crypto, formatAddress } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ErrorCodes, getErrorMessage } from './errors'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { SwapDetails } from './swap-details'

export function LiquidityHub() {
  const { tokensWithBalances, isLoading } = useTokensWithBalances()
  const [srcToken, setSrcToken] = useState<Token | null>(null)
  const [dstToken, setDstToken] = useState<Token | null>(null)
  const [srcAmount, setSrcAmount] = useState<string>('')
  const [inputError, setInputError] = useState<string | null>(null)
  const debouncedSrcAmount = useDebounce(srcAmount, 300)
  const account = useAccount()

  const initialTokens = useMemo(() => {
    if (!tokensWithBalances) return []

    return [
      tokensWithBalances[zeroAddress].token,
      Object.values(tokensWithBalances).find((t) => t.token.symbol === 'USDT')
        ?.token || null,
    ].filter(Boolean) as Token[]
  }, [tokensWithBalances])

  const { data: srcPriceUsd } = usePriceUSD(137, srcToken?.address)
  const { data: dstPriceUsd } = usePriceUSD(137, dstToken?.address)

  const {
    data: quote,
    isFetching,
    error: quoteError,
  } = useQuote({
    chainId: 137,
    fromToken: srcToken?.address || '',
    toToken: dstToken?.address || '',
    inAmount: debouncedSrcAmount
      ? amountBN(srcToken?.decimals, debouncedSrcAmount).toString()
      : '0',
    slippage: 0.5,
    partner: 'widget',
    account: account.address,
  })

  const { srcAmountUsd, dstAmountUsd, dstAmount } = useMemo(() => {
    const srcAmountUsd = BN(debouncedSrcAmount || 0)
      .times(srcPriceUsd || 0)
      .toFixed(2)
      .toString()

    const dstAmount = quote?.outAmount
      ? amountUi(dstToken?.decimals, quote.outAmount)
      : ''

    const dstAmountUsd = BN(dstAmount || 0)
      .times(dstPriceUsd || 0)
      .toFixed(2)
      .toString()

    return {
      srcAmountUsd,
      dstAmountUsd,
      dstAmount,
    }
  }, [
    debouncedSrcAmount,
    srcPriceUsd,
    dstToken?.decimals,
    quote?.outAmount,
    dstPriceUsd,
  ])

  const handleSwitch = useCallback(() => {
    setSrcToken(dstToken)
    setDstToken(srcToken)

    setSrcAmount('')
  }, [srcToken, dstToken])

  useEffect(() => {
    if (!srcToken && tokensWithBalances) {
      setSrcToken(initialTokens[0])
    }

    if (!dstToken && tokensWithBalances) {
      setDstToken(initialTokens[1])
    }
  }, [srcToken, initialTokens, dstToken, tokensWithBalances])

  useEffect(() => {
    if (!srcToken || !tokensWithBalances) return

    const valueBN = amountBN(srcToken.decimals, debouncedSrcAmount)
    const balance = tokensWithBalances[srcToken.address].balance

    if (valueBN.gt(balance.toString())) {
      setInputError(ErrorCodes.InsufficientBalance)
      return
    }

    setInputError(null)
  }, [debouncedSrcAmount, srcToken, tokensWithBalances])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center mt-28">
        <Spinner />
      </div>
    )
  }

  if (!tokensWithBalances) {
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
        amount={srcAmount}
        amountUsd={srcAmountUsd}
        balance={
          tokensWithBalances && srcToken
            ? amountUi(
                srcToken.decimals,
                tokensWithBalances[srcToken.address]?.balance.toString()
              )
            : '0.00'
        }
        selectedToken={srcToken || initialTokens[0]}
        tokens={tokensWithBalances}
        onSelectToken={setSrcToken}
        onValueChange={setSrcAmount}
        inputError={inputError}
      />
      <div className="h-0 relative z-10 flex items-center justify-center">
        <SwitchButton onClick={handleSwitch} />
      </div>
      <TokenCard
        label="Buy"
        amount={dstAmount ? crypto.format(Number(dstAmount)) : ''}
        amountUsd={dstAmountUsd}
        balance={
          tokensWithBalances && dstToken
            ? amountUi(
                dstToken.decimals,
                tokensWithBalances[dstToken.address]?.balance.toString()
              )
            : '0.00'
        }
        selectedToken={dstToken || initialTokens[1]}
        tokens={tokensWithBalances}
        onSelectToken={setDstToken}
        isAmountEditable={false}
        amountLoading={isFetching}
      />
      {account.isConnected ? (
        <Button
          className="mt-2"
          size="lg"
          disabled={Boolean(
            quoteError || inputError || !srcAmount || !dstAmount
          )}
        >
          {inputError === ErrorCodes.InsufficientBalance
            ? 'Insufficient balance'
            : 'Swap'}
        </Button>
      ) : (
        <ConnectButton />
      )}
      {quoteError && (
        <div className="text-red-600">
          {getErrorMessage(quoteError.message)}
        </div>
      )}
      {dstToken &&
        srcToken &&
        dstAmount &&
        quote &&
        dstPriceUsd &&
        account.address && (
          <SwapDetails
            dstAmount={dstAmount}
            dstToken={dstToken}
            dstAmountUsd={dstAmountUsd}
            srcAmountUsd={srcAmountUsd}
            quote={quote}
            dstPriceUsd={dstPriceUsd}
            account={formatAddress(account.address)}
          />
        )}
    </div>
  )
}

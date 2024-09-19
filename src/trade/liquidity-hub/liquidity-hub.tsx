import { Spinner } from '@/components/spinner'
import { TokenCard } from '@/components/tokens/token-card'
import { SwitchButton } from '@/components/ui/switch-button'
import { Token } from '@/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTokensWithBalances } from '@/lib/hooks/tokens/useTokensWithBalances'
import { zeroAddress } from 'viem'
import { usePriceUSD } from '@/lib/hooks/balances/usePriceUsd'
import { useAccount } from 'wagmi'
import { useQuote } from '@/lib/hooks/liquidity-hub/useQuote'
import { useDebounce } from '@/lib/hooks/utils'
import { toBigNumber, fromBigNumber, format, toBigInt } from '@/lib/utils'
import { ErrorCodes, getErrorMessage } from './errors'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { SwapDetails } from './swap-details'
import { SwapConfirmationDialog } from './swap-confirmation-dialog'
import { SwapStepStatus, useSwapStore } from './useSwapStore'
import StepManager from './step-manager'

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

  const steps = useSwapStore((state) => state.steps)
  const resetSwapStore = useSwapStore((state) => state.reset)

  // on exit check if swap is still processing and if not reset swap store
  useEffect(() => {
    return () => {
      if (steps && steps[steps.length - 1].status === SwapStepStatus.Complete) {
        console.log('resetting swap store')
        resetSwapStore()
      }
    }
  }, [resetSwapStore, steps])

  const {
    data: quote,
    isFetching,
    error: quoteError,
  } = useQuote(
    {
      chainId: 137,
      fromToken: srcToken?.address || '',
      toToken: dstToken?.address || '',
      inAmount: debouncedSrcAmount
        ? toBigNumber(debouncedSrcAmount, srcToken?.decimals)
        : '0',
      slippage: 0.5,
      partner: 'widget',
      account: account.address,
    },
    Boolean(steps)
  )

  const { srcAmountUsd, dstAmountUsd, dstAmount } = useMemo(() => {
    const srcAmountUsd = (Number(debouncedSrcAmount || 0) * (srcPriceUsd || 0))
      .toFixed(2)
      .toString()

    const dstAmount = quote?.outAmount
      ? fromBigNumber(quote.outAmount, dstToken?.decimals).toString()
      : ''

    const dstAmountUsd = (Number(dstAmount || 0) * (dstPriceUsd || 0))
      .toFixed(2)
      .toString()

    return {
      srcAmountUsd,
      dstAmountUsd,
      dstAmount,
    }
  }, [debouncedSrcAmount, srcPriceUsd, quote?.outAmount, dstToken, dstPriceUsd])

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

    const valueBN = toBigInt(debouncedSrcAmount, srcToken.decimals)
    const balance = tokensWithBalances[srcToken.address].balance

    if (valueBN > balance) {
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
            ? fromBigNumber(
                tokensWithBalances[srcToken.address]?.balance,
                srcToken.decimals
              )
            : 0
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
        amount={dstAmount ? format.crypto(Number(dstAmount)) : ''}
        amountUsd={dstAmountUsd}
        balance={
          tokensWithBalances && dstToken
            ? fromBigNumber(
                tokensWithBalances[dstToken.address]?.balance || 0n,
                dstToken.decimals
              )
            : 0
        }
        selectedToken={dstToken || initialTokens[1]}
        tokens={tokensWithBalances}
        onSelectToken={setDstToken}
        isAmountEditable={false}
        amountLoading={isFetching}
      />
      {account.address && account.isConnected ? (
        <SwapConfirmationDialog
          account={account.address}
          dstAmount={dstAmount}
          dstAmountUsd={dstAmountUsd}
          dstPriceUsd={dstPriceUsd}
          dstToken={dstToken}
          inputError={inputError}
          quote={quote}
          quoteError={quoteError}
          srcToken={srcToken}
          srcAmount={srcAmount}
          srcAmountUsd={srcAmountUsd}
        />
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
        srcPriceUsd &&
        dstPriceUsd &&
        account.address && (
          <SwapDetails
            srcToken={srcToken}
            dstAmount={dstAmount}
            dstToken={dstToken}
            dstAmountUsd={dstAmountUsd}
            srcAmountUsd={srcAmountUsd}
            quote={quote}
            srcPriceUsd={srcPriceUsd}
            dstPriceUsd={dstPriceUsd}
            account={format.address(account.address)}
            srcAmount={srcAmount}
          />
        )}
      <StepManager />
    </div>
  )
}

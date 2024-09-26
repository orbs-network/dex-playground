import { Spinner } from '@/components/spinner'
import { TokenCard } from '@/components/tokens/token-card'
import { SwitchButton } from '@/components/ui/switch-button'
import { Token } from '@/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTokensWithBalances } from '@/lib/hooks/tokens/useTokensWithBalances'
import { SwapStatus } from '@orbs-network/swap-ui'
import { zeroAddress } from 'viem'
import { usePriceUSD } from '@/lib/hooks/balances/usePriceUsd'
import { useAccount } from 'wagmi'
import { useDebounce } from '@/lib/hooks/utils'
import { toBigNumber, fromBigNumber, format, toBigInt } from '@/lib/utils'
import { ErrorCodes, getSDKErrorMessage } from './liquidity-hub/errors'
import { SwapDetails } from './swap-details'
import { SwapConfirmationDialog } from './swap-confirmation-dialog'
import { useDexRouter } from '@/trade/swap/liquidity-hub/dex-router'
import { useQuote } from './liquidity-hub/useQuote'
import { Button } from '@/components/ui/button'
import { useSwap } from './liquidity-hub/swap-flow/useSwap'
import { useGetRequiresApproval } from './liquidity-hub/swap-flow/useGetRequiresApproval'
import './style.css'
import { Quote } from '@orbs-network/liquidity-hub-sdk'
import { Steps } from './liquidity-hub/types'

const slippage = 0.5

const getDexMinAmountOut = (slippage: number, _destAmount: string) => {
  const slippageFactor = BigInt(1000 - Math.floor(slippage * 10)) // 0.5% becomes 995

  // Convert priceRoute.destAmount to BigInt
  const destAmount = BigInt(_destAmount)

  // Calculate the minimum amount considering slippage
  return ((destAmount * slippageFactor) / BigInt(1000)).toString()
}

export function Swap() {
  const { tokensWithBalances, isLoading } = useTokensWithBalances()
  const [inToken, setInToken] = useState<Token | null>(null)
  const [outToken, setOutToken] = useState<Token | null>(null)
  const [inputAmount, setInputAmount] = useState<string>('')
  const [inputError, setInputError] = useState<string | null>(null)
  const [acceptedQuote, setAcceptedQuote] = useState<Quote | undefined>()
  const debouncedInAmount = useDebounce(inputAmount, 300)
  const [currentStep, setCurrentStep] = useState<Steps | undefined>(undefined)
  const account = useAccount()

  const initialTokens = useMemo(() => {
    if (!tokensWithBalances) return []

    return [
      tokensWithBalances[zeroAddress].token,
      Object.values(tokensWithBalances).find((t) => t.token.symbol === 'USDT')
        ?.token || null,
    ].filter(Boolean) as Token[]
  }, [tokensWithBalances])

  const { data: inPriceUsd } = usePriceUSD(137, inToken?.address)
  const { data: outPriceUsd } = usePriceUSD(137, outToken?.address)

  const inAmount = useMemo(() => {
    return debouncedInAmount
      ? toBigNumber(debouncedInAmount, inToken?.decimals)
      : '0'
  }, [debouncedInAmount, inToken?.decimals])

  const { data: dexQuote } = useDexRouter({
    inToken: inToken?.address || '',
    outToken: outToken?.address || '',
    inAmount: inAmount,
  })

  const dexMinAmountOut = useMemo(
    () => getDexMinAmountOut(slippage, dexQuote?.destAmount || '0'),
    [dexQuote?.destAmount]
  )

  const {
    data: _quote,
    isFetching,
    error: quoteError,
    getLatestQuote,
  } = useQuote({
    fromToken: inToken?.address || '',
    toToken: outToken?.address || '',
    inAmount,
    slippage,
    account: account.address,
    dexMinAmountOut,
  })

  const quote = acceptedQuote || _quote

  const onAcceptQuote = useCallback((quote?: Quote) => {
    setAcceptedQuote(quote)
  }, [])

  // Comparing Liquidity Hub min amount out with dex min amount out
  // this comparison allows the dex to determine whether they should
  // use the Liquidity Hub or their existing router
  /*
  const isLiquidityHubTrade = useMemo(() => {
    return toBigInt(quote?.minAmountOut || 0) > BigInt(dexMinAmountOut)
  }, [quote?.minAmountOut, dexMinAmountOut])
  */

  const { inAmountUsd, outAmountUsd, outAmount } = useMemo(() => {
    const inAmountUsd = (Number(debouncedInAmount || 0) * (inPriceUsd || 0))
      .toFixed(2)
      .toString()

    const outAmount = quote?.outAmount
      ? fromBigNumber(quote.outAmount, outToken?.decimals).toString()
      : ''

    const outAmountUsd = (Number(outAmount || 0) * (outPriceUsd || 0))
      .toFixed(2)
      .toString()

    return {
      inAmountUsd,
      outAmountUsd,
      outAmount,
    }
  }, [
    debouncedInAmount,
    inPriceUsd,
    quote?.outAmount,
    outToken?.decimals,
    outPriceUsd,
  ])
  const { mutate: swap } = useSwap()

  const { requiresApproval, approvalLoading } = useGetRequiresApproval(quote)
  const [swapStatus, setSwapStatus] = useState<SwapStatus | undefined>(
    undefined
  )

  const confirmSwap = useCallback(() => {
    if (!inToken) return
    swap({
      inTokenAddress: inToken.address,
      getQuote: getLatestQuote,
      requiresApproval,
      onAcceptQuote,
      setSwapStatus,
      setCurrentStep,
    })
  }, [inToken, swap, getLatestQuote, requiresApproval, onAcceptQuote])

  const handleSwitch = useCallback(() => {
    setInToken(outToken)
    setOutToken(inToken)

    setInputAmount('')
  }, [inToken, outToken])

  useEffect(() => {
    if (!inToken && tokensWithBalances) {
      setInToken(initialTokens[0])
    }

    if (!outToken && tokensWithBalances) {
      setOutToken(initialTokens[1])
    }
  }, [inToken, initialTokens, outToken, tokensWithBalances])

  useEffect(() => {
    if (!inToken || !tokensWithBalances) return

    const valueBN = toBigInt(debouncedInAmount, inToken.decimals)
    const balance = tokensWithBalances[inToken.address].balance

    if (valueBN > balance) {
      setInputError(ErrorCodes.InsufficientBalance)
      return
    }

    setInputError(null)
  }, [debouncedInAmount, inToken, tokensWithBalances])

  const [isOpen, setIsOpen] = useState(false)

  const onClose = useCallback(() => {
    setIsOpen(false)
    setInputAmount('')
    setAcceptedQuote(undefined)
  }, [])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center mt-28">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 pt-2">
      <TokenCard
        label="Sell"
        amount={inputAmount}
        amountUsd={inAmountUsd}
        balance={
          tokensWithBalances && inToken
            ? fromBigNumber(
                tokensWithBalances[inToken.address]?.balance,
                inToken.decimals
              )
            : 0
        }
        selectedToken={inToken || initialTokens[0]}
        tokens={tokensWithBalances || {}}
        onSelectToken={setInToken}
        onValueChange={setInputAmount}
        inputError={inputError}
      />
      <div className="h-0 relative z-10 flex items-center justify-center">
        <SwitchButton onClick={handleSwitch} />
      </div>
      <TokenCard
        label="Buy"
        amount={outAmount ? format.crypto(Number(outAmount)) : ''}
        amountUsd={outAmountUsd}
        balance={
          tokensWithBalances && outToken
            ? fromBigNumber(
                tokensWithBalances[outToken.address]?.balance || 0n,
                outToken.decimals
              )
            : 0
        }
        selectedToken={outToken || initialTokens[1]}
        tokens={tokensWithBalances || {}}
        onSelectToken={setOutToken}
        isAmountEditable={false}
        amountLoading={isFetching}
      />
      {account.address && account.isConnected && outToken && inToken ? (
        <>
          <SwapConfirmationDialog
            account={account.address}
            outAmount={outAmount}
            outAmountUsd={outAmountUsd}
            outPriceUsd={outPriceUsd}
            outToken={outToken}
            quote={quote}
            inToken={inToken}
            inAmount={inputAmount}
            inAmountUsd={inAmountUsd}
            onClose={onClose}
            isOpen={isOpen}
            confirmSwap={confirmSwap}
            requiresApproval={requiresApproval}
            approvalLoading={approvalLoading}
            swapStatus={swapStatus}
            currentStep={currentStep}
          />

          <Button
            className="mt-2"
            size="lg"
            onClick={() => setIsOpen(true)}
            disabled={Boolean(
              quoteError || inputError || !inAmount || !outAmount || !quote
            )}
          >
            {inputError === ErrorCodes.InsufficientBalance
              ? 'Insufficient balance'
              : 'Swap'}
          </Button>
        </>
      ) : (
        <Button className="mt-2" size="lg" disabled>
          Wallet not connected
        </Button>
      )}
      {quoteError && (
        <div className="text-red-600">
          {getSDKErrorMessage(quoteError.message)}
        </div>
      )}
      {outToken &&
        inToken &&
        outAmount &&
        quote &&
        inPriceUsd &&
        outPriceUsd &&
        account.address && (
          <SwapDetails
            inToken={inToken}
            outAmount={outAmount}
            outToken={outToken}
            outAmountUsd={outAmountUsd}
            inAmountUsd={inAmountUsd}
            quote={quote}
            inPriceUsd={inPriceUsd}
            outPriceUsd={outPriceUsd}
            account={format.address(account.address)}
          />
        )}
    </div>
  )
}

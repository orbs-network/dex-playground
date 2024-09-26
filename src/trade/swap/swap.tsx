import { Spinner } from '@/components/spinner'
import { TokenCard } from '@/components/tokens/token-card'
import { SwitchButton } from '@/components/ui/switch-button'
import { SwapSteps, Token } from '@/types'
import { useCallback, useMemo, useState } from 'react'
import { SwapStatus } from '@orbs-network/swap-ui'
import { useAccount } from 'wagmi'
import { SwapDetails } from './swap-details'
import { SwapConfirmationDialog } from './swap-confirmation-dialog'
import { useQuote } from './liquidity-hub/useQuote'
import { Button } from '@/components/ui/button'
import { useSwap } from './liquidity-hub/useSwap'
import { Quote } from '@orbs-network/liquidity-hub-sdk'
import {
  useDefaultTokens,
  useAmounts,
  useDexMinAmountOut,
  useGetRequiresApproval,
  useHandleInputError,
  ErrorCodes,
  format,
  fromBigNumber,
  getQuoteErrorMessage,
  toBigNumber,
  useDebounce,
  useTokensWithBalances,
} from '@/lib'
import './style.css'

const slippage = 0.5

export function Swap() {
  const { tokensWithBalances, isLoading, refetch } = useTokensWithBalances()
  const [inToken, setInToken] = useState<Token | null>(null)
  const [outToken, setOutToken] = useState<Token | null>(null)
  const [inputAmount, setInputAmount] = useState<string>('')
  const [inputError, setInputError] = useState<string | null>(null)
  const [acceptedQuote, setAcceptedQuote] = useState<Quote | undefined>()
  const debouncedInputAmount = useDebounce(inputAmount, 300)
  const [currentStep, setCurrentStep] = useState<SwapSteps | undefined>(
    undefined
  )
  const [swapStatus, setSwapStatus] = useState<SwapStatus | undefined>(
    undefined
  )
  const [swapConfirmOpen, setSwapConfirmOpen] = useState(false)

  // Get wagmi account
  const account = useAccount()

  // Set Initial Tokens
  const defaultTokens = useDefaultTokens({
    inToken,
    outToken,
    tokensWithBalances,
    setInToken,
    setOutToken,
  })

  // Handle Amount Input Error
  useHandleInputError({
    debouncedInputAmount,
    inToken,
    tokensWithBalances,
    setInputError,
  })

  // Handle Token Switch
  const handleSwitch = useCallback(() => {
    setInToken(outToken)
    setOutToken(inToken)
    setInputAmount('')
  }, [inToken, outToken])

  // Handle Swap Confirmation Dialog Close
  const onSwapConfirmClose = useCallback(() => {
    setSwapConfirmOpen(false)
    setAcceptedQuote(undefined)
    setInputAmount('')
    setInputError(null)
    setCurrentStep(undefined)
    setSwapStatus(undefined)
    refetch()
  }, [refetch])

  /* --------- Quote ---------- */
  // The entered input amount has to be converted to a big int string
  // to be used for getting quotes
  const inAmountBigIntStr = useMemo(() => {
    return toBigNumber(debouncedInputAmount, inToken?.decimals)
  }, [debouncedInputAmount, inToken?.decimals])

  const { data: dexMinAmountOut } = useDexMinAmountOut({
    slippage,
    inToken: inToken?.address || '',
    outToken: outToken?.address || '',
    inAmount: inAmountBigIntStr,
  })

  // Fetch Liquidity Hub Quote
  const {
    data: _quote,
    isFetching,
    error: quoteError,
    getLatestQuote,
  } = useQuote({
    fromToken: inToken?.address || '',
    toToken: outToken?.address || '',
    inAmount: inAmountBigIntStr,
    slippage,
    account: account.address,
    dexMinAmountOut,
  })
  const quote = acceptedQuote || _quote

  // Comparing Liquidity Hub min amount out with dex min amount out
  // this comparison allows the dex to determine whether they should
  // use the Liquidity Hub or their existing router
  /*
  const isLiquidityHubTrade = useMemo(() => {
    return toBigInt(quote?.minAmountOut || 0) > BigInt(dexMinAmountOut)
  }, [quote?.minAmountOut, dexMinAmountOut])
  */
  /* --------- End Quote ---------- */

  /* --------- Swap ---------- */
  const onAcceptQuote = useCallback((quote?: Quote) => {
    setAcceptedQuote(quote)
  }, [])
  const { mutate: swap } = useSwap()
  const { requiresApproval, approvalLoading } = useGetRequiresApproval(quote)
  const confirmSwap = useCallback(() => {
    if (!inToken) return
    swap({
      inTokenAddress: inToken.address,
      getQuote: getLatestQuote,
      requiresApproval,
      onAcceptQuote,
      setSwapStatus,
      setCurrentStep,
      onFailure: onSwapConfirmClose,
    })
  }, [
    inToken,
    swap,
    getLatestQuote,
    requiresApproval,
    onAcceptQuote,
    onSwapConfirmClose,
  ])
  /* --------- End Swap ---------- */

  // Calculate all amounts for display purposes
  const { inAmountUsd, inPriceUsd, outAmount, outAmountUsd, outPriceUsd } =
    useAmounts({ inToken, outToken, inAmount: debouncedInputAmount, quote })

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
        balance={fromBigNumber(
          tokensWithBalances &&
            inToken &&
            tokensWithBalances[inToken.address].balance,
          inToken?.decimals
        )}
        selectedToken={inToken || defaultTokens[0]}
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
        balance={fromBigNumber(
          tokensWithBalances &&
            outToken &&
            tokensWithBalances[outToken.address].balance,
          outToken?.decimals
        )}
        selectedToken={outToken || defaultTokens[1]}
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
            inToken={inToken}
            inAmount={inputAmount}
            inAmountUsd={inAmountUsd}
            onClose={onSwapConfirmClose}
            isOpen={swapConfirmOpen}
            confirmSwap={confirmSwap}
            requiresApproval={requiresApproval}
            approvalLoading={approvalLoading}
            swapStatus={swapStatus}
            currentStep={currentStep}
          />

          <Button
            className="mt-2"
            size="lg"
            onClick={() => setSwapConfirmOpen(true)}
            disabled={Boolean(quoteError || inputError || !quote)}
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
          {getQuoteErrorMessage(quoteError.message)}
        </div>
      )}

      <SwapDetails
        inToken={inToken}
        outAmount={outAmount}
        outToken={outToken}
        quote={quote}
        inPriceUsd={inPriceUsd}
        outPriceUsd={outPriceUsd}
        account={account.address}
      />
    </div>
  )
}

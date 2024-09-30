import { TokenCard } from '@/components/tokens/token-card'
import { SwitchButton } from '@/components/ui/switch-button'
import { SwapSteps, Token } from '@/types'
import { useCallback, useMemo, useState } from 'react'
import { SwapStatus } from '@orbs-network/swap-ui'
import { useAccount } from 'wagmi'
import { SwapDetails } from '../../components/swap-details'
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
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

const slippage = 0.5

export function Swap() {
  const queryClient = useQueryClient()
  const { tokensWithBalances, queryKey } = useTokensWithBalances()
  const [inToken, setInToken] = useState<Token | null>(null)
  const [outToken, setOutToken] = useState<Token | null>(null)
  const [inputAmount, setInputAmount] = useState<string>('')
  const [inputError, setInputError] = useState<string | null>(null)
  const [acceptedQuote, setAcceptedQuote] = useState<Quote | undefined>()
  const debouncedInputAmount = useDebounce(inputAmount, 300)
  const [liquidityHubDisabled, setLiquidityHubDisabled] = useState(false)
  const [currentStep, setCurrentStep] = useState<SwapSteps | undefined>(
    undefined
  )
  const [swapStatus, setSwapStatus] = useState<SwapStatus | undefined>(
    undefined
  )
  const [swapConfirmOpen, setSwapConfirmOpen] = useState(false)
  const [signature, setSignature] = useState<string | undefined>(undefined)

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
    setSignature(undefined)
    setSwapStatus(undefined)
    queryClient.invalidateQueries({ queryKey })
  }, [queryClient, queryKey])

  /* --------- Quote ---------- */
  // The entered input amount has to be converted to a big int string
  // to be used for getting quotes
  const inAmountBigIntStr = useMemo(() => {
    return toBigNumber(debouncedInputAmount, inToken?.decimals)
  }, [debouncedInputAmount, inToken?.decimals])

  // TODO: This will be updated with a more generic hook called useDexTrade
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
  } = useQuote(
    {
      fromToken: inToken?.address || '',
      toToken: outToken?.address || '',
      inAmount: inAmountBigIntStr,
      slippage,
      account: account.address,
      dexMinAmountOut,
    },
    liquidityHubDisabled
  )
  /* --------- End Quote ---------- */

  const quote = acceptedQuote || _quote

  /* --------- Swap ---------- */
  const onAcceptQuote = useCallback((quote?: Quote) => {
    setAcceptedQuote(quote)
  }, [])
  const { mutateAsync: swap } = useSwap()
  const { requiresApproval, approvalLoading } = useGetRequiresApproval(quote)

  const proceedWithDexSwap = useCallback(() => {
    // Proceed with the dex swap
  }, [])

  const proceedWithLiquidityHubSwap = useCallback(async () => {
    try {
      await swap({
        inTokenAddress: inToken!.address,
        getQuote: getLatestQuote,
        requiresApproval,
        onAcceptQuote,
        setSwapStatus,
        setCurrentStep,
        onFailure: onSwapConfirmClose,
        setSignature,
      })
    } catch (error) {
      // If the liquidity hub swap fails, need to set the flag to prevent further attempts, and proceed with the dex swap
      // stop quotting from liquidity hub
      // start new flow with dex swap
      console.error(error)
      toast.error('Liquidity Hub swap failed, proceeding with Dex swap')
      setLiquidityHubDisabled(true)
      proceedWithDexSwap()
    }
  }, [
    swap,
    inToken,
    getLatestQuote,
    requiresApproval,
    onAcceptQuote,
    onSwapConfirmClose,
    proceedWithDexSwap,
  ])

  const confirmSwap = useCallback(async () => {
    // Choose between liquidity hub and dex swap based on the min amount out
    // this logic is commented out for now, as we are only using the liquidity hub for the example
    // if (!liquidityHubDisabled &&  toBigInt(quote?.minAmountOut || 0) > BigInt(dexMinAmountOut || 0)) {
    //   proceedWithLiquidityHubSwap();
    // } else {
    //   proceedWithDexSwap();
    // }
    proceedWithLiquidityHubSwap()
  }, [proceedWithLiquidityHubSwap])

  /* --------- End Swap ---------- */

  // Calculate all amounts for display purposes
  const { inAmountUsd, inPriceUsd, outAmount, outAmountUsd, outPriceUsd } =
    useAmounts({ inToken, outToken, inAmount: debouncedInputAmount, quote })

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
            signature={signature}
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

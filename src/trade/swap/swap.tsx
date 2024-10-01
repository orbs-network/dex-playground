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
import { useLiquidityHubSwapCallback } from './liquidity-hub/useLiquidityHubSwapCallback'
import { permit2Address, Quote } from '@orbs-network/liquidity-hub-sdk'
import {
  useDefaultTokens,
  useGetRequiresApproval,
  useHandleInputError,
  ErrorCodes,
  format,
  fromBigNumber,
  toBigNumber,
  useTokensWithBalances,
  getMinAmountOut,
  useParaswapQuote,
  getQuoteErrorMessage,
  useParaswapSwapCallback,
  toBigInt,
  isNativeAddress,
  networks,
} from '@/lib'
import './style.css'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { Address } from 'viem'

const slippage = 0.5

export function Swap() {
  const queryClient = useQueryClient()
  const { tokensWithBalances, queryKey } = useTokensWithBalances()
  const [inToken, setInToken] = useState<Token | null>(null)
  const [outToken, setOutToken] = useState<Token | null>(null)
  const [inputAmount, setInputAmount] = useState<string>('')
  const [inputError, setInputError] = useState<string | null>(null)
  const [acceptedQuote, setAcceptedQuote] = useState<Quote | undefined>()
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
    inputAmount,
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

  const resetSwap = useCallback(() => {
    setAcceptedQuote(undefined)
    setInputAmount('')
    setInputError(null)
    setCurrentStep(undefined)
    setSignature(undefined)
    setSwapStatus(undefined)
    setLiquidityHubDisabled(false)
    queryClient.invalidateQueries({ queryKey })
  }, [queryClient, queryKey])

  // Handle Swap Confirmation Dialog Close
  const onSwapConfirmClose = useCallback(() => {
    setSwapConfirmOpen(false)
    resetSwap()
  }, [resetSwap])

  /* --------- Quote ---------- */
  // The entered input amount has to be converted to a big int string
  // to be used for getting quotes

  const inputAmountAsBigNumber = toBigNumber(inputAmount, inToken?.decimals)
  const { data: optimalRate, isLoading: optimalRateLoading } = useParaswapQuote(
    {
      inToken: inToken?.address || '',
      outToken: outToken?.address || '',
      inAmount: inputAmountAsBigNumber,
    }
  )

  const paraswapMinAmountOut = getMinAmountOut(
    slippage,
    optimalRate?.destAmount || '0'
  )

  // Fetch Liquidity Hub Quote
  const {
    data: _quote,
    getLatestQuote,
    error: quoteError,
  } = useQuote(
    {
      fromToken: inToken?.address || '',
      toToken: outToken?.address || '',
      inAmount: inputAmountAsBigNumber,
      slippage,
      account: account.address,
      dexMinAmountOut: paraswapMinAmountOut,
    },
    liquidityHubDisabled
  )

  const liquidityHubQuote = acceptedQuote || _quote

  /* --------- End Quote ---------- */

  /* --------- Swap ---------- */
  const liquidityProvider = useMemo(() => {
    // Choose between liquidity hub and dex swap based on the min amount out
    if (
      !liquidityHubDisabled &&
      toBigInt(liquidityHubQuote?.minAmountOut || 0) >
        BigInt(paraswapMinAmountOut || 0)
    ) {
      return 'liquidityhub'
    } else {
      return 'paraswap'
    }
  }, [
    liquidityHubDisabled,
    liquidityHubQuote?.minAmountOut,
    paraswapMinAmountOut,
  ])

  const onAcceptQuote = useCallback((quote?: Quote) => {
    setAcceptedQuote(quote)
  }, [])
  const { mutateAsync: swap } = useLiquidityHubSwapCallback()
  const { mutateAsync: paraswapSwapCallback } = useParaswapSwapCallback()
  const { requiresApproval, approvalLoading } = useGetRequiresApproval(
    liquidityProvider === 'paraswap' && optimalRate
      ? (optimalRate.tokenTransferProxy as Address)
      : permit2Address,
    liquidityProvider === 'paraswap' || !isNativeAddress(inToken?.address)
      ? inToken?.address
      : networks.poly.wToken.address,
    inputAmountAsBigNumber
  )

  const swapWithParaswap = useCallback(async () => {
    if (!optimalRate) return
    try {
      await paraswapSwapCallback({
        optimalRate,
        slippage,
        requiresApproval,
        setCurrentStep,
        setSwapStatus,
        onFailure: resetSwap,
      })
    } catch (error) {
      // handle error in ui
      console.error(error)
    }
  }, [optimalRate, paraswapSwapCallback, requiresApproval, resetSwap])

  const proceedWithLiquidityHubSwap = useCallback(async () => {
    if (!optimalRate) {
      return
    }
    try {
      await swap({
        inTokenAddress: inToken!.address,
        getQuote: getLatestQuote,
        requiresApproval,
        onAcceptQuote,
        setSwapStatus,
        setCurrentStep,
        onFailure: resetSwap,
        setSignature,
        slippage,
        optimalRate,
      })
    } catch (error) {
      // If the liquidity hub swap fails, need to set the flag to prevent further attempts, and proceed with the dex swap
      // stop quotting from liquidity hub
      // start new flow with dex swap
      console.error(error)
      toast.error('Liquidity Hub swap failed, proceeding with Dex swap')
      setLiquidityHubDisabled(true)
      swapWithParaswap()
    }
  }, [
    optimalRate,
    swap,
    inToken,
    getLatestQuote,
    requiresApproval,
    onAcceptQuote,
    resetSwap,
    swapWithParaswap,
  ])

  const confirmSwap = useCallback(async () => {
    if (liquidityProvider === 'liquidityhub') {
      proceedWithLiquidityHubSwap()
    } else {
      setLiquidityHubDisabled(true)
      swapWithParaswap()
    }
  }, [liquidityProvider, proceedWithLiquidityHubSwap, swapWithParaswap])
  /* --------- End Swap ---------- */

  const destAmount = optimalRate?.destAmount
    ? fromBigNumber(optimalRate.destAmount, outToken?.decimals).toString()
    : ''

  const openConnectModal = useConnectModal().openConnectModal
  return (
    <div className="flex flex-col gap-2 pt-2">
      <TokenCard
        label="Sell"
        amount={inputAmount}
        amountUsd={optimalRate?.srcUSD}
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
        amount={destAmount ? format.crypto(Number(destAmount)) : ''}
        amountUsd={optimalRate?.destUSD}
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
        amountLoading={optimalRateLoading}
      />
      {account.address && account.isConnected && outToken && inToken ? (
        <>
          <SwapConfirmationDialog
            optimalRate={optimalRate}
            outToken={outToken}
            inToken={inToken}
            onClose={onSwapConfirmClose}
            isOpen={swapConfirmOpen}
            confirmSwap={confirmSwap}
            requiresApproval={requiresApproval}
            approvalLoading={approvalLoading}
            swapStatus={swapStatus}
            currentStep={currentStep}
            signature={signature}
            liquidityHubQuote={liquidityHubQuote}
            liquidityProvider={liquidityProvider}
          />
          <Button
            className="mt-2"
            size="lg"
            onClick={() => setSwapConfirmOpen(true)}
            disabled={Boolean(
              inputError || optimalRateLoading || !liquidityHubQuote
            )}
          >
            {inputError === ErrorCodes.InsufficientBalance
              ? 'Insufficient balance'
              : inputAmount && !liquidityHubQuote
              ? 'Fetching quote...'
              : 'Swap'}
          </Button>
        </>
      ) : (
        <Button className="mt-2" size="lg" onClick={openConnectModal}>
          Connect wallet
        </Button>
      )}

      {quoteError && (
        <div className="text-red-600">
          {getQuoteErrorMessage(quoteError.message)}
        </div>
      )}

      <SwapDetails
        optimalRate={optimalRate}
        inToken={inToken}
        outToken={outToken}
        minAmountOut={paraswapMinAmountOut}
        account={account.address}
        liquidityProvider={liquidityProvider}
      />
    </div>
  )
}

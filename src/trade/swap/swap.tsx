import { TokenCard } from '@/components/tokens/token-card'
import { SwitchButton } from '@/components/ui/switch-button'
import { SwapSteps, Token } from '@/types'
import { useCallback, useMemo, useState } from 'react'
import { SwapStatus } from '@orbs-network/swap-ui'
import { useAccount } from 'wagmi'
import { SwapDetails } from '../../components/swap-details'
import { SwapConfirmationDialog } from './swap-confirmation-dialog'
import { useLiquidityHubQuote } from './liquidity-hub/useLiquidityHubQuote'
import { Button } from '@/components/ui/button'
import { useLiquidityHubSwapCallback } from './liquidity-hub/useLiquidityHubSwapCallback'
import { permit2Address, Quote } from '@orbs-network/liquidity-hub-sdk'
import {
  useDefaultTokens,
  useHandleInputError,
  ErrorCodes,
  fromBigNumber,
  toBigNumber,
  useTokensWithBalances,
  getMinAmountOut,
  useParaswapQuote,
  getQuoteErrorMessage,
  useParaswapSwapCallback,
  toBigInt,
  fromBigNumberToStr,
  getErrorMessage,
} from '@/lib'
import './style.css'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { toast } from 'sonner'
import { SettingsIcon } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

const slippage = 0.5

export function Swap() {
  const { tokensWithBalances, refetch: refetchBalances } =
    useTokensWithBalances()
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
  const [forceLiquidityHub, setForceLiquidityHub] = useState(false)

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
    refetchBalances()
  }, [refetchBalances])

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
  } = useLiquidityHubQuote(
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
      forceLiquidityHub ||
      (!liquidityHubDisabled &&
        toBigInt(liquidityHubQuote?.minAmountOut || 0) >
          BigInt(paraswapMinAmountOut || 0))
    ) {
      return 'liquidityhub'
    }

    return 'paraswap'
  }, [
    forceLiquidityHub,
    liquidityHubDisabled,
    liquidityHubQuote?.minAmountOut,
    paraswapMinAmountOut,
  ])

  const onAcceptQuote = useCallback((quote?: Quote) => {
    setAcceptedQuote(quote)
  }, [])
  const { mutateAsync: liquidityHubSwapCallback } =
    useLiquidityHubSwapCallback()
  const { mutateAsync: paraswapSwapCallback } = useParaswapSwapCallback()

  const swapWithParaswap = useCallback(async () => {
    if (!optimalRate) return
    try {
      await paraswapSwapCallback({
        optimalRate,
        slippage,
        setCurrentStep,
        setSwapStatus,
        onFailure: resetSwap,
      })
    } catch (error) {
      console.error(error)
      toast.error(getErrorMessage(error, 'An error occurred while swapping'))
    }
  }, [optimalRate, paraswapSwapCallback, resetSwap])

  const swapWithLiquidityHub = useCallback(async () => {
    if (!optimalRate) {
      toast.error('An unknown error occurred')
      return
    }

    try {
      await liquidityHubSwapCallback({
        inTokenAddress: inToken!.address,
        getQuote: getLatestQuote,
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
      // stop quoting from liquidity hub
      // start new flow with dex swap
      console.error(error)
      console.log('Liquidity Hub Swap failed, proceeding with ParaSwap...')
      setLiquidityHubDisabled(true)
      swapWithParaswap()
    }
  }, [
    optimalRate,
    liquidityHubSwapCallback,
    inToken,
    getLatestQuote,
    onAcceptQuote,
    resetSwap,
    swapWithParaswap,
  ])

  const confirmSwap = useCallback(async () => {
    if (liquidityProvider === 'liquidityhub') {
      console.log('Proceeding with Liquidity Hub')
      swapWithLiquidityHub()
    } else {
      console.log('Proceeding with ParaSwap')
      setLiquidityHubDisabled(true)
      swapWithParaswap()
    }
  }, [liquidityProvider, swapWithLiquidityHub, swapWithParaswap])
  /* --------- End Swap ---------- */

  const destAmount = optimalRate?.destAmount
    ? fromBigNumberToStr(optimalRate.destAmount, outToken?.decimals)
    : ''

  const { openConnectModal } = useConnectModal()
  return (
    <div>
      <div className="flex justify-end">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon">
              <SettingsIcon />
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <div>
              <div className="flex gap-2 items-center justify-between">
                <Label htmlFor="force-lh">Force Liquidity Hub</Label>
                <Switch
                  id="force-lh"
                  onCheckedChange={(checked) => setForceLiquidityHub(checked)}
                  checked={forceLiquidityHub}
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex flex-col gap-2 pt-2">
        <TokenCard
          label="Sell"
          amount={inputAmount}
          amountUsd={optimalRate?.srcUSD}
          balance={
            (tokensWithBalances &&
              inToken &&
              tokensWithBalances[inToken.address].balance) ||
            0n
          }
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
          amount={destAmount ?? ''}
          amountUsd={optimalRate?.destUSD}
          balance={
            (tokensWithBalances &&
              outToken &&
              tokensWithBalances[outToken.address].balance) ||
            0n
          }
          selectedToken={outToken || defaultTokens[1]}
          tokens={tokensWithBalances || {}}
          onSelectToken={setOutToken}
          isAmountEditable={false}
          amountLoading={optimalRateLoading}
        />
        {account.address && account.isConnected && outToken && inToken ? (
          <>
            <SwapConfirmationDialog
              outToken={outToken}
              inToken={inToken}
              onClose={onSwapConfirmClose}
              isOpen={swapConfirmOpen}
              confirmSwap={confirmSwap}
              swapStatus={swapStatus}
              currentStep={currentStep}
              signature={signature}
              liquidityProvider={liquidityProvider}
              inAmount={fromBigNumber(optimalRate?.srcAmount, inToken.decimals)}
              inAmountUsd={optimalRate?.srcUSD}
              outAmount={
                Number(
                  liquidityProvider === 'liquidityhub'
                    ? fromBigNumberToStr(
                        liquidityHubQuote?.referencePrice || '0',
                        outToken.decimals
                      )
                    : destAmount
                ) || 0
              }
              outAmountUsd={optimalRate?.destUSD}
              allowancePermitAddress={
                liquidityProvider === 'paraswap' && optimalRate
                  ? optimalRate.tokenTransferProxy
                  : permit2Address
              }
            />

            <Button
              className="mt-2"
              size="lg"
              onClick={() => setSwapConfirmOpen(true)}
              disabled={Boolean(
                inputError ||
                  optimalRateLoading ||
                  !liquidityHubQuote ||
                  !optimalRate
              )}
            >
              {inputError === ErrorCodes.InsufficientBalance
                ? 'Insufficient balance'
                : inputAmount && !liquidityHubQuote
                ? 'Fetching quote...'
                : !optimalRate && inputAmount
                ? 'No liquidity'
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
    </div>
  )
}

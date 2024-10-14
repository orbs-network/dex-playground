import { TokenCard } from '@/components/tokens/token-card'
import { SwitchButton } from '@/components/ui/switch-button'
import { SwapSteps, Token } from '@/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { SwapStatus } from '@orbs-network/swap-ui'
import { useAccount } from 'wagmi'
import { SwapDetails } from '../../components/swap-details'
import { Button } from '@/components/ui/button'
import {
  useDefaultTokens,
  useHandleInputError,
  ErrorCodes,
  fromBigNumber,
  toBigNumber,
  useTokensWithBalances,
  getMinAmountOut,
  useParaswapQuote,
  fromBigNumberToStr,
  networks,
  usePriceUsd,
  toBigInt,
} from '@/lib'
import '../style.css'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { SettingsIcon } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { TimeDuration } from '@orbs-network/twap-sdk'
import { useCreateOrder } from './useCreateOrder'
import { useTwapSdk } from './useTwapSdk'
import { SwapConfirmationDialog } from '../swap/swap-confirmation-dialog'
import { LimitPriceInput } from './limit-price-input'
import { Chunks } from './chunks'
import { FillDelay } from './fill-delay'

const isLimitPanel = false

export function Twap() {
  const { tokensWithBalances, refetch: refetchBalances } =
    useTokensWithBalances()
  const [inToken, setInToken] = useState<Token | null>(null)
  const [outToken, setOutToken] = useState<Token | null>(null)
  const [inputAmount, setInputAmount] = useState<string>('')
  const [inputError, setInputError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<SwapSteps | undefined>(
    undefined
  )
  const [swapStatus, setSwapStatus] = useState<SwapStatus | undefined>(
    undefined
  )
  const [swapConfirmOpen, setSwapConfirmOpen] = useState(false)
  const [signature, setSignature] = useState<string | undefined>(undefined)
  const [forceLiquidityHub, setForceLiquidityHub] = useState(false)
  const [slippage, setSlippage] = useState(0.5)

  const [limitInverted, setLimitInverted] = useState(false)
  const [customFillDelay, setCustomFillDelay] = useState<
    TimeDuration | undefined
  >(undefined)
  const [isMarketOrder, setIsMarketOrder] = useState(false)
  const [customChunks, setCustomChunks] = useState<number | undefined>(
    undefined
  )
  const [customLimitPrice, setCustomLimitPrice] = useState<undefined | string>(
    undefined
  )

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
    setInputAmount('')
    setInputError(null)
    setCurrentStep(undefined)
    setSignature(undefined)
    setSwapStatus(undefined)
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

  const inputAmountAsBigNumber = useMemo(
    () => toBigNumber(inputAmount, inToken?.decimals),
    [inToken?.decimals, inputAmount]
  )
  const { data: optimalRate, isLoading: optimalRateLoading } = useParaswapQuote(
    {
      inToken: inToken?.address || '',
      outToken: outToken?.address || '',
      inAmount: inputAmountAsBigNumber,
    }
  )
  const { data: baseRate } = useParaswapQuote({
    inToken: inToken?.address || '',
    outToken: outToken?.address || '',
    inAmount: toBigNumber('1', inToken?.decimals),
  })

  const paraswapMinAmountOut = getMinAmountOut(
    slippage,
    optimalRate?.destAmount || '0'
  )

  /* --------- End Quote ---------- */

  const { data: oneSrcTokenUsd } = usePriceUsd(
    networks.poly.id,
    inToken?.address
  )

  const marketPrice = useMemo(
    () => baseRate?.destAmount,
    [baseRate?.destAmount]
  )

  const price = useMemo(() => {
    if (isMarketOrder || customLimitPrice === undefined) {
      return BigInt(marketPrice || '0')
    }
    let result = Number(customLimitPrice)
    if (limitInverted) {
      result = 1 / Number(customLimitPrice)
    }

    return toBigInt(result, outToken?.decimals)
  }, [
    isMarketOrder,
    customLimitPrice,
    limitInverted,
    outToken?.decimals,
    marketPrice,
  ])

  const outAmount = useMemo(() => {
    if (!price || !inputAmount) return ''

    const result = price * BigInt(inputAmount)

    return result.toString()
  }, [price, inputAmount])

  const { mutateAsync: createOrder } = useCreateOrder()

  const onCreateOrder = useCallback(async () => {
    if (!inToken || !outToken || !optimalRate) return

    createOrder()
    // create order
  }, [inToken, outToken, optimalRate, createOrder])

  const onMarketOrderChange = useCallback((isMarket: boolean) => {
    setIsMarketOrder(isMarket)
    setCustomLimitPrice(undefined)
  }, [])

  useEffect(() => {
    if (isLimitPanel) {
      onMarketOrderChange(false)
    }
  }, [onMarketOrderChange])

  const twapSDK = useTwapSdk()

  const swapValues = twapSDK.derivedSwapValues({
    srcAmount: inputAmount,
    limitPrice: '',
    oneSrcTokenUsd,
    isLimitPanel,
    srcDecimals: inToken?.decimals,
    destDecimals: outToken?.decimals,
    isMarketOrder: true,
    customFillDelay,
    customChunks,
  })

  const { fillDelay, chunks, srcChunkAmount } = swapValues

  const destAmount = outAmount
    ? fromBigNumberToStr(outAmount, outToken?.decimals)
    : ''

  const { openConnectModal } = useConnectModal()
  return (
    <div>
      <div className="flex justify-end">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon">
              <SettingsIcon className="w-5 h-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <div className="flex flex-col gap-4">
              <div className="flex gap-4 items-center justify-between">
                <Label htmlFor="slippage">Slippage</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="slippage"
                    type="number"
                    onChange={(e) => setSlippage(e.target.valueAsNumber)}
                    value={slippage}
                    step={0.1}
                    className="text-right w-16 [&::-webkit-inner-spin-button]:appearance-none p-2 h-7"
                  />
                  <div>%</div>
                </div>
              </div>
              <div className="flex gap-4 items-center justify-between">
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
        {!isLimitPanel && (
          <div className="flex gap-4 justify-end mb-2">
            <div className="flex gap-2">
              <div>Market order</div>
              <Switch
                checked={!isMarketOrder}
                onCheckedChange={(checked) => onMarketOrderChange(!checked)}
              />
              <div>Limit order</div>
            </div>
          </div>
        )}
        {!isMarketOrder && (
          <LimitPriceInput
            customLimitPrice={customLimitPrice}
            marketPrice={fromBigNumberToStr(
              marketPrice || '0',
              outToken?.decimals
            )}
            onValueChange={setCustomLimitPrice}
            inToken={inToken}
            outToken={outToken}
            setOutToken={setOutToken}
            setInToken={setInToken}
            limitInverted={limitInverted}
            setLimitInverted={setLimitInverted}
          />
        )}
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
        <FillDelay fillDelay={fillDelay} onChange={setCustomFillDelay} />
        <Chunks
          chunks={chunks}
          onChange={setCustomChunks}
          srcChunkAmount={srcChunkAmount}
          inToken={inToken}
        />
        {account.address && account.isConnected && outToken && inToken ? (
          <>
            <SwapConfirmationDialog
              outToken={outToken}
              inToken={inToken}
              onClose={onSwapConfirmClose}
              isOpen={swapConfirmOpen}
              confirmSwap={onCreateOrder}
              swapStatus={swapStatus}
              currentStep={currentStep}
              signature={signature}
              liquidityProvider="paraswap"
              inAmount={fromBigNumber(optimalRate?.srcAmount, inToken.decimals)}
              inAmountUsd={optimalRate?.srcUSD}
              outAmount={Number(destAmount)}
              outAmountUsd={optimalRate?.destUSD}
              allowancePermitAddress={optimalRate?.tokenTransferProxy || ''}
            />

            <Button
              className="mt-2"
              size="lg"
              onClick={() => setSwapConfirmOpen(true)}
              disabled={Boolean(
                inputError || optimalRateLoading || !optimalRate
              )}
            >
              {inputError === ErrorCodes.InsufficientBalance
                ? 'Insufficient balance'
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

        <SwapDetails
          optimalRate={optimalRate}
          inToken={inToken}
          outToken={outToken}
          minAmountOut={paraswapMinAmountOut}
          account={account.address}
          liquidityProvider={'paraswap'}
        />
      </div>
    </div>
  )
}

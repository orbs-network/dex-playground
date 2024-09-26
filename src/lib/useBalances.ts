import { useQuery } from '@tanstack/react-query'
import { getBalance, multicall } from '@wagmi/core'
import { Config, serialize, useBalance, useConfig } from 'wagmi'
import { GetBalanceReturnType } from 'wagmi/actions'
import { Token, TokensWithBalances } from '@/types'
import { erc20Abi, isAddress, Address } from 'viem'
import { zeroAddress } from '@orbs-network/liquidity-hub-sdk'

interface QueryBalanceParams {
  chainId: number | undefined
  tokens: Token[]
  account: string | undefined
  nativeBalance?: GetBalanceReturnType
  config: Config
}

export const queryFnUseBalances = async ({
  chainId,
  tokens,
  account,
  nativeBalance,
  config,
}: QueryBalanceParams) => {
  if (!account || !chainId || !tokens) return null

  let native = nativeBalance
  if (typeof native === 'undefined') {
    native = await getBalance(config, {
      address: account as Address,
      chainId,
    })
  }

  const [validatedTokens, validatedTokenAddresses] = tokens.reduce<
    [Token[], Address[]]
  >(
    (acc, tokens) => {
      if (chainId && tokens && isAddress(tokens.address)) {
        acc[0].push(tokens)
        acc[1].push(tokens.address as Address)
      }

      return acc
    },
    [[], []]
  )

  const data = await multicall(config, {
    contracts: validatedTokenAddresses.map(
      (token) =>
        ({
          chainId,
          address: token,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [account],
        } as const)
    ),
  })

  const _data = data.reduce<TokensWithBalances>((acc, _cur, i) => {
    const amount = data[i].result
    if (typeof amount === 'bigint') {
      acc[validatedTokens[i].address] = {
        token: validatedTokens[i],
        balance: amount,
      }
    }
    return acc
  }, {})

  _data[zeroAddress] = {
    token: validatedTokens[0],
    balance: native.value,
  }

  return _data
}

interface UseBalanceParams {
  chainId: number | undefined
  tokens: Token[]
  account: Address | undefined
  enabled?: boolean
}

export const useBalances = ({
  chainId,
  tokens,
  account,
  enabled = true,
}: UseBalanceParams) => {
  const { data: nativeBalance, queryKey } = useBalance({
    chainId,
    address: account,
    query: { enabled, refetchInterval: 10000, staleTime: 10000 },
  })

  const config = useConfig()

  return {
    query: useQuery({
      queryKey: [
        'useBalances',
        { chainId, tokens, account, nativeBalance: serialize(nativeBalance) },
      ],
      queryFn: () =>
        queryFnUseBalances({
          chainId,
          tokens,
          account,
          nativeBalance,
          config,
        }),
      refetchInterval: 10000,
      staleTime: 10000,
      enabled: Boolean(chainId && account && enabled && tokens),
    }),
    queryKey: [...queryKey, 'useBalances'],
  }
}

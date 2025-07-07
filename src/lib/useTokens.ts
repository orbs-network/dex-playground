/* eslint-disable @typescript-eslint/no-explicit-any */
import { Token } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { useAccount, usePublicClient } from 'wagmi';
import { erc20Abi, formatUnits } from 'viem';
import { zeroAddress } from '@orbs-network/liquidity-hub-sdk';
import { eqIgnoreCase } from './utils';
import { useMemo } from 'react';
import * as chains from 'viem/chains';
import { BASE_TOKENS } from '@/trade/swap/consts';
import { getNetwork } from './networks';

const chainToName = {
  [chains.flare.id]: 'flare-network',
  [chains.fantom.id]: 'fantom',
  [chains.arbitrum.id]: 'arbitrum-one',
  [chains.polygon.id]: 'polygon-pos',
  [chains.base.id]: 'base',
  [chains.mainnet.id]: 'ethereum',
  [chains.bsc.id]: 'binance-smart-chain',
  [chains.linea.id]: 'linea',
  [chains.sonic.id]: 'sonic',
  [chains.cronoszkEVM.id]: 'cronos-zkevm',
  [chains.mantle.id]: 'mantle',
  [chains.berachain.id]: 'berachain',
};

const getSeiTokens = async (signal?: AbortSignal): Promise<Token[]> => {
  const res = await fetch(
    'https://raw.githubusercontent.com/dragonswap-app/assets/main/tokenlist-sei-mainnet.json',
    { signal }
  );
  const data = await res.json();

  return data.tokens.map((token: any) => {
    return {
      address:
        token.address === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
          ? zeroAddress
          : token.address,
      symbol: token.symbol,
      decimals: token.decimals,
      logoUrl: `https://raw.githubusercontent.com/dragonswap-app/assets/main/logos/${token.address}/logo.png`,
      name: token.name,
    };
  });
};

const fetchTokens = async (chainId: number, signal?: AbortSignal): Promise<Token[]> => {
  const name = chainToName[chainId as keyof typeof chainToName];
  let tokens: Token[] = [];

  if (name) {
    const result = await fetch(`https://tokens.coingecko.com/${name}/all.json`, { signal }).then(
      (res) => res.json()
    );
    tokens = result.tokens.map((token: any): Token => {
      return {
        address: token.address,
        symbol: token.symbol,
        decimals: token.decimals,
        logoUrl: token.logoURI,
      };
    });
  } else {
    switch (chainId) {
      case chains.sei.id:
        tokens = await getSeiTokens(signal);
        break;
    }
  }

  const nativeToken = getNetwork(chainId)?.native;

  if (nativeToken) {
    tokens.unshift(nativeToken);
  }
  

  return tokens
    .sort((a, b) => {
      const aPriority = BASE_TOKENS.includes(a.symbol) ? 0 : 1;
      const bPriority = BASE_TOKENS.includes(b.symbol) ? 0 : 1;
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      return a.address.localeCompare(b.address);
    })
    .slice(0, 100);
};

const useTokensList = () => {
  const chainId = useAccount().chainId;

  return useQuery<Token[]>({
    queryFn: async ({ signal }) => {
      const response = await fetchTokens(chainId!, signal);
      return response;
    },
    queryKey: ['useTokensList', chainId],
    staleTime: Infinity,
    enabled: !!chainId,
  });
};

export const useTokenBalances = () => {
  const { data: tokens } = useTokensList();
  const { address: account, chainId } = useAccount();
  const client = usePublicClient();

  const query = useQuery<Record<string, string>>({
    queryKey: ['token-balances', chainId, account, tokens?.length],
    queryFn: async () => {
      const addressesWithoutNative = tokens!
        .map((token) => token.address)
        .filter((it) => !eqIgnoreCase(it, zeroAddress));

      const [nativeBalance, multicallResponse] = await Promise.all([
        client!.getBalance({ address: account as `0x${string}` }),
        client!.multicall({
          contracts: addressesWithoutNative!.map((address) => {
            return {
              address: address as `0x${string}`,
              abi: erc20Abi,
              functionName: 'balanceOf',
              args: [account],
            };
          }),
        }),
      ]);

      

      return multicallResponse.reduce(
        (acc: Record<string, string>, it: any, index: number) => {
          acc[addressesWithoutNative![index]] = it.result?.toString() || '0';
          return acc;
        },
        { [zeroAddress]: nativeBalance.toString() }
      );
    },
    enabled: Boolean(client && tokens?.length && account),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  return query;
};

export const useTokenBalance = (tokenAddress?: string) => {
  const { data: balances, isLoading } = useTokenBalances();
  return useMemo(() => {
    return {
      isLoading,
      balance: !tokenAddress ? '0' : balances?.[tokenAddress],
    };
  }, [balances, tokenAddress, isLoading]);
};

export const useTokens = () => {
  const { data: allTokens, isLoading: tokensLoading } = useTokensList();
  const { data: balances, isLoading: balancesLoading } = useTokenBalances();
  const tokens = useMemo(() => {
    if (!allTokens || !balances) {
      return [];
    }
    const sorted = allTokens.sort((a, b) => {
      const balanceA = formatUnits(BigInt(balances?.[a.address] ?? '0'), a.decimals || 18);
      const balanceB = formatUnits(BigInt(balances?.[b.address] ?? '0'), b.decimals || 18);
      return Number(balanceB) - Number(balanceA);
    });
    console.log({sorted, balances});
    
    const native = sorted.find((it) => eqIgnoreCase(it.address, zeroAddress));
    if (native) {
      sorted.splice(sorted.indexOf(native), 1);
      sorted.unshift(native);
    }
    return sorted;
  }, [allTokens, balances]);

  return {
    tokens,
    isLoading: tokensLoading || balancesLoading,
  };
};

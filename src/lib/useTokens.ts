import { Token } from '@/types';
import { getNetwork, networks } from './networks';
import { useQuery } from '@tanstack/react-query';
import { useAccount, useBalance, useReadContracts } from 'wagmi';
import { erc20Abi } from 'viem';
import { zeroAddress } from '@orbs-network/liquidity-hub-sdk';
import { eqIgnoreCase } from './utils';
import { useCallback, useMemo } from 'react';
import { tokenLists } from './tokens';

const getFantomTokens = async (signal?: AbortSignal): Promise<Token[]> => {
  const res = await fetch(
    'https://raw.githubusercontent.com/viaprotocol/tokenlists/main/tokenlists/ftm.json',
    { signal }
  );
  const data = await res.json();
  return data.map((token: any) => {
    return {
      address: token.address,
      symbol: token.symbol,
      decimals: token.decimals,
      logoUrl: token.logoURI,
      name: token.name,
    };
  });
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

const getSushiTokens = async (chainId: number, signal?: AbortSignal): Promise<Token[]> => {
  const tokens = await fetch('https://token-list.sushi.com/', { signal }).then((res) =>
    res.json().then((it) => it.tokens.filter((it: any) => it.chainId === chainId))
  );

  return Object.values(tokens).map((token: any) => {
    return {
      address: token.address,
      symbol: token.symbol,
      decimals: token.decimals,
      logoUrl: token.logoURI,
      name: token.name,
    };
  });
};

const getLineaTokens = async (signal?: AbortSignal): Promise<Token[]> => {
  const tokens = await fetch('https://api.lynex.fi/api/v1/assets', { signal })
    .then((res) => res.json())
    .then((res) => res.data);
  return tokens.map((token: any) => {
    return {
      address: token.address,
      symbol: token.symbol,
      decimals: token.decimals,
      logoUrl: token.logoURI,
      name: token.name,
    };
  });
};

const addNativeToken = (tokens: Token[], network: typeof networks.eth) => {
  if (tokens.find((t) => eqIgnoreCase(t.address, network.native.address))) {
    return tokens;
  }
  return [
    {
      address: network.native.address,
      symbol: network.native.symbol,
      decimals: network.native.decimals,
      logoUrl: network.native.logoUrl,
    },
    ...tokens,
  ];
};

const sortTokens = (tokens: Token[], network: typeof networks.eth) => {
  const baseAssets = network.baseAssets;
  if (!baseAssets) {
    return tokens;
  }
  const sortedTokens = tokens.sort((a, b) => {
    const aPriority = baseAssets.includes(a.address) ? 0 : 1;
    const bPriority = baseAssets.includes(b.address) ? 0 : 1;
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    return a.address.localeCompare(b.address);
  });

  return sortedTokens;
};

const getBaseTokens = (): Token[] => {
  const _tokens = tokenLists.base;

  return Object.values(_tokens).map((token) => {
    return {
      address: token.address,
      symbol: token.symbol,
      decimals: token.decimals,
      logoUrl: token.tokenInfo.logoURI,
      name: token.name,
    };
  });
};

const fetchTokens = async (chainId: number, signal?: AbortSignal): Promise<Token[]> => {
  const network = getNetwork(chainId);
  if (!network) {
    throw new Error(`Network with chainId ${chainId} not found`);
  }

  let tokens: Token[] = [];
  switch (chainId) {
    case networks.linea.id:
      tokens = await getLineaTokens(signal);
      break;
    case networks.ftm.id:
      tokens = await getFantomTokens(signal);
      break;
    case networks.sei.id:
      tokens = await getSeiTokens(signal);
      break;
    case networks.sei.id:
      tokens = await getSeiTokens(signal);
      break;
    case networks.base.id:
      tokens = getBaseTokens();
      break;

    default:
      tokens = await getSushiTokens(chainId, signal);
      break;
  }

  tokens = addNativeToken(tokens, network);
  return sortTokens(tokens, network);
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

export const useTokenBalaces = () => {
  const { data: tokens } = useTokensList();
  const { address: account, chainId } = useAccount();
  const native = useBalance({
    address: account,
    chainId,
    query:{
      enabled: Boolean(account && chainId),
      staleTime: Infinity,
      refetchOnWindowFocus: false
    }
  });
  const nativeBalance = native?.data?.value.toString();

  const addresses = useMemo(
    () => tokens?.map((token) => token.address).filter((it) => !eqIgnoreCase(it, zeroAddress)),
    [tokens]
  );

  const contracts = useMemo(() => {
    if (!tokens) return [];

    return addresses?.map(
      (address) =>
        ({
          chainId,
          address,
          abi: erc20Abi,
          type: 'function',
          functionName: 'balanceOf',
          args: [account],
        } as const)
    );
  }, [addresses, account, chainId]);

  const result = (useReadContracts as any)({
    batchSize: 1024,
    contracts, // Pass an array of contract calls,
    query:{
      enabled: Boolean(account && chainId && addresses?.length),
      staleTime: Infinity,
      refetchOnWindowFocus: false
    }
  });

  const { data } = result;

  const balances = useMemo(() => {
    if (!addresses || !data || !nativeBalance) return;
    const result = addresses?.reduce((acc: any, address: any, index: number) => {
      acc[address] = data[index].result?.toString() || '0';
      return acc;
    }, {});

    result[zeroAddress] = nativeBalance;
    return result;
  }, [addresses, data, nativeBalance]);

  const refetch = useCallback(() => {
    native.refetch();
    result.refetch();
  }, [result, native]);

  return {
    ...result,
    balances,
    refetch,
  };
};

export const useTokenBalance = (tokenAddress?: string) => {
  const { balances, isLoading } = useTokenBalaces();
  return useMemo(() => {
    if (!tokenAddress) {
      return {
        isLoading,
        balance: '0',
      };
    }
    return {
      isLoading,
      balance: balances?.[tokenAddress] || '0',
    };
  }, [balances, tokenAddress, isLoading]);
};

export const useSortedTokens = () => {
  const { data: tokens } = useTokensList();
  const { balances } = useTokenBalaces();
  return useMemo(() => {
    const sorted = tokens?.sort((a, b) => {
      const balanceA = BigInt(balances?.[a.address] || '0');
      const balanceB = BigInt(balances?.[b.address] || '0');
      return balanceB > balanceA ? 1 : balanceB < balanceA ? -1 : 0;
    });

    const native = sorted?.find((it) => eqIgnoreCase(it.address, zeroAddress));
    if (native) {
      sorted?.splice(sorted.indexOf(native), 1);
      sorted?.unshift(native);
    }
    return sorted;
  }, [tokens, balances]);
};

import { useNetwork } from '@/trade/hooks';
import { useMemo } from 'react';
import { useSortedTokens } from './useTokens';

const DEFAULT_TOKENS = ['USDC', 'WS', 'ETH'];

const getTokens = (tokens: any, wTokenSymbol: string) => {
  const inToken = tokens.find((token: any) => DEFAULT_TOKENS.includes(token.symbol));
  let outToken = tokens.find(
    (token: any) => token.symbol.toLowerCase() === wTokenSymbol?.toLowerCase()
  );

  if (outToken && outToken === inToken) {
    outToken = tokens.find((token: any) => token !== inToken);
  }

  return { inToken, outToken };
};
export function useDefaultTokens() {
  const tokens = useSortedTokens();
  const wToken = useNetwork()?.wToken.symbol;

  return useMemo(() => {
    if (!tokens || !wToken) return;

    return getTokens(tokens, wToken);
  }, [tokens, wToken]);
}

import { zeroAddress } from "viem";

export const QUOTE_REFETCH_INTERVAL = 20_000;

export const nativeTokenAddresses = [
    zeroAddress,
    '0x0000000000000000000000000000000000001010',
    '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    '0x000000000000000000000000000000000000dEaD',
    '0x000000000000000000000000000000000000800A',
  ];

  export const BASE_TOKENS = [
    // Stablecoins
    'USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'FRAX', 'LUSD', 'GUSD', 'USDN', 'USDP', 'ALUSD',
  
    // Wrapped assets
    'WBTC', 'WETH', 'WMATIC', 'WBNB', 'WAVAX', 'WFTM', 'WGLMR', 'WCELO', 'WSEI', 'WS',
  
    // Native tokens and L1s
    'ETH', 'BNB', 'MATIC', 'AVAX', 'FTM', 'GLMR', 'CELO', 'SEI', 'S',
  
    // L2 tokens
    'ARB', 'OP', 'METIS', 'ZKS', 'BOBA',
  
    // Governance and DeFi tokens
    'AAVE', 'UNI', 'COMP', 'MKR', 'CRV', 'SNX', '1INCH', 'BAL', 'LDO', 'CVX', 'YFI',
  
    // RWA and synthetic assets
    'sUSD', 'wstETH', 'rETH', 'ankrETH', 'cbETH',
  
    // Cross-chain assets
    'AXL', 'AXLUSDC', 'AXLUSDT', 'nUSD',
  
    // Others (frequently used in DEXs or bridges)
    'SUSHI', 'CAKE', 'JOE', 'SPIRIT', 'QUICK', 'VELO'
  ];
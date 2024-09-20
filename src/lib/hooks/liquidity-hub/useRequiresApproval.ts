import { networks } from '@/lib/networks'
import { fromBigNumber, isNativeAddress } from '@/lib/utils'
import { Token } from '@/types'
import { permit2Address } from '@orbs-network/liquidity-hub-sdk'
import { useMemo } from 'react'
import { Address, erc20Abi } from 'viem'
import { useReadContract } from 'wagmi'

type UseAllowanceProps = {
  tokenAddress: string
  account: string
  srcToken: Token | null
  srcAmount: number
}

export function useRequiresApproval({
  account,
  tokenAddress,
  srcToken,
  srcAmount,
}: UseAllowanceProps) {
  const { data: allowanceBi, ...rest } = useReadContract({
    address: (isNativeAddress(tokenAddress)
      ? networks.poly.wToken.address
      : tokenAddress) as Address,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [account as Address, permit2Address],
  })

  const requiresApproval = useMemo(() => {
    if (!srcToken) return false
    const allowanceNum = fromBigNumber(allowanceBi || 0n, srcToken.decimals)
    return allowanceNum < srcAmount
  }, [allowanceBi, srcAmount, srcToken])

  return { data: requiresApproval, ...rest }
}

import { useAccount, useReadContract } from "wagmi";
import { isNativeAddress } from "./utils";
import { networks } from "./networks";
import { Address, erc20Abi } from "viem";
const maxUint256 =
  "115792089237316195423570985008687907853269984665640564039457584007913129639935";

/* Determines whether user needs tp approve allowance for quoted token */
export function useGetRequiresApproval({
  inTokenAddress,
  inAmount = maxUint256,
  contractAddress,
}: {
  inTokenAddress?: string;
  inAmount?: string;
  contractAddress: string;
}) {
  const { address } = useAccount();
  const tokenAddress = (
    isNativeAddress(inTokenAddress) ? networks.poly.wToken.address : inTokenAddress
  ) as Address;

  const { data: allowance, isLoading } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: [address as Address, contractAddress],
  });

  return {
    requiresApproval: (allowance || 0n) < BigInt(inAmount || 0),
    approvalLoading: isLoading,
  };
}

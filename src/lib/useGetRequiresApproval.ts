import { useAccount, useReadContract } from "wagmi";
import { Address, erc20Abi } from "viem";
import { useNetwork } from "@/trade/hooks";
import { isNativeAddress } from "./utils";

/* Determines whether user needs tp approve allowance for quoted token */
export function useGetRequiresApproval(
  contractAddress?: any,
  inTokenAddress = "",
  inAmount = ""
) {
  const { address: account } = useAccount();
  const wToken = useNetwork()?.wToken.address;
  const address = isNativeAddress(inTokenAddress) ? wToken : inTokenAddress;
  const {
    data: allowance,
    isLoading,
    error,
  } = useReadContract({
    address: address as Address,
    abi: erc20Abi,
    functionName: "allowance",
    args: [account as Address, contractAddress],
    query: { enabled: Boolean(inTokenAddress && address && contractAddress) },
  });
  
  return {
    requiresApproval: (allowance || 0n) < BigInt(inAmount || 0),
    approvalLoading: isLoading,
    error,
  };
}

import { isNativeAddress, waitForConfirmations } from "./utils";
import { Address, erc20Abi, maxUint256 } from "viem";
import { useMutation } from "@tanstack/react-query";
import { useAccount, useWriteContract } from "wagmi";
import { useNetwork } from "@/trade/hooks";

export function useApproveAllowance() {
  const { address: account } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const wToken = useNetwork()?.wToken.address;

  return useMutation({
    mutationFn: async ({
      token: _token,
      spender,
      amount,
    }: {
      token?: string;
      spender?: string;
      amount?: string;
    }) => {
      const token = isNativeAddress(_token) ? wToken : _token;

      console.log("Approving allowance...");
      const txHash = await writeContractAsync({
        abi: erc20Abi,
        functionName: "approve",
        args: [spender as `0x${string}`, amount ? BigInt(amount) : maxUint256],
        account: account as Address,
        address: token as Address,
      });

      // Check for confirmations for a maximum of 20 seconds
      await waitForConfirmations(txHash, 1, 20);
      console.log("Approved allowance");

      return txHash;
    },
    onError: (error) => {
      throw error;
    },
  });
}

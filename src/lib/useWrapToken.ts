import { useNetwork } from "@/trade/hooks";
import { useMutation } from "@tanstack/react-query";
import { Address } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import { IWETHabi } from "./abis";
import { waitForConfirmations } from "./utils";

export const useWrapToken = () => {
  const { writeContractAsync } = useWriteContract();
  const { address: account } = useAccount();
  const address = useNetwork()?.wToken.address
  return useMutation({
    mutationFn: async (inAmount: string) => {
      const txHash = await writeContractAsync({
        abi: IWETHabi,
        functionName: "deposit",
        account: account as Address,
        address: address as Address,
        value: BigInt(inAmount.replace(".", "")),
      });
      await waitForConfirmations(txHash, 1, 20);
      return txHash;
    },
    onError: (error) => {
      throw error;
    },
  });
};

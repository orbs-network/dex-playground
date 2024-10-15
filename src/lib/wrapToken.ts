import { toast } from "sonner"
import { simulateContract, writeContract } from 'wagmi/actions'
import { IWETHabi } from "./abis"
import { networks } from "./networks"
import { getErrorMessage, waitForConfirmations } from "./utils"
import { wagmiConfig } from "./wagmi-config"

export const wrapToken = async (account: string, inAmount: string) => {

   try {
    const simulatedData = await simulateContract(wagmiConfig, {
        abi: IWETHabi,
        functionName: 'deposit',
        account: account as Address,
        address: networks.poly.wToken.address as Address,
        value: inAmount
      })
      
      // Perform the deposit contract function
      const txHash = await writeContract(wagmiConfig, simulatedData.request)
      await waitForConfirmations(txHash, 1, 20)
      return txHash
   } catch (error) {
    console.log({ error });

    const errorMessage = getErrorMessage(
        error,
        'An error occurred while wrapping your token'
      )
      toast.error(errorMessage)
      throw new Error(errorMessage)
   }
      
}
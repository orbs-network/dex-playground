import { toExactAmount, toRawAmount } from "@/lib"
import { useMemo } from "react"

export const useToExactAmount = (amount?: string, decimals?: number) => {
return useMemo(() => toExactAmount(amount, decimals), [amount, decimals])
}

export const useToRawAmount = (amount?: string, decimals?: number) => {
    return useMemo(() => toRawAmount(amount, decimals), [amount, decimals])
}

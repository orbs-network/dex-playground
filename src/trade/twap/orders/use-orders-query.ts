import { groupOrdersByStatus } from "@orbs-network/twap-sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAccount } from "wagmi";
import { useTwapContext } from "../context";

const useOrdersQueryKey = () => {
  const { address } = useAccount();
  const { twapSDK } = useTwapContext();
  return useMemo(
    () => ["useOrdersQuery", address, twapSDK.config.chainId],
    [address, twapSDK.config.chainId]
  );
};
export function useOrdersQuery() {
  const { address } = useAccount();
  const { twapSDK } = useTwapContext();
  const queryKey = useOrdersQueryKey();
  return useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const orders = await twapSDK.getUserOrders({ account: address!, signal });
      
      return orders;
    },
    enabled: !!address,
    staleTime: Infinity,
    refetchInterval: 20_000,
  });
}

export const useWaitForNewOrderCallback = () => {
  const { address } = useAccount();
  const { twapSDK } = useTwapContext();
  const { refetch } = useOrdersQuery();
  const queryKey = useOrdersQueryKey();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId?: number) => {
      if (!orderId) {
        return refetch();
      }
      const orders = await twapSDK.waitForOrdersUpdate(orderId, address!);
      if (!orders) {
        return refetch();
      }

      queryClient.setQueryData(queryKey, orders);
    },
  });
};

export const useGroupedOrders = () => {
  const { data: orders } = useOrdersQuery();
  return useMemo(() => {
    if (!orders) return null;
    const res = groupOrdersByStatus(orders);
    return res;
  }, [orders]);
};

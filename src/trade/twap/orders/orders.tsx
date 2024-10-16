import { OrderDetails } from "@/components/order-details";
import * as RadixAccordion from "@radix-ui/react-accordion";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  cn,
  eqIgnoreCase,
  format,
  makeElipsisAddress,
  useTokensList,
  wagmiConfig,
  waitForConfirmations,
} from "@/lib";
import { Token } from "@/types";
import { Order, OrderStatus, OrderType, TwapAbi } from "@orbs-network/twap-sdk";
import { AvatarImage } from "@radix-ui/react-avatar";
import { ArrowRightIcon, ChevronDownIcon } from "lucide-react";
import { useCallback, useMemo } from "react";
import { Virtuoso } from "react-virtuoso";
import { OrdersContextProvider, useOrdersContext } from "./orders-context";
import { useGroupedOrders, useOrdersQuery } from "./use-orders-query";
import { useExplorer, useToExactAmount } from "@/trade/hooks";
import moment from "moment";
import { useMutation } from "@tanstack/react-query";
import { useTwapContext } from "../twap-context";
import {
  writeContract,
  simulateContract,
  getTransactionReceipt,
} from "wagmi/actions";
import { useAccount } from "wagmi";

export function Orders() {
  return (
    <OrdersContextProvider>
      <OrdersButton />
      <OrdersModal />
    </OrdersContextProvider>
  );
}

const OrdersModal = () => {
  const { isOpen, setIsOpen, selectedOrderID, setSelectedOrderID } =
    useOrdersContext();

  const onClose = useCallback(() => {
    if (selectedOrderID) {
      setSelectedOrderID(undefined);
    } else {
      setIsOpen(false);
    }
  }, [setIsOpen, selectedOrderID, setSelectedOrderID]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle>Orders</DialogTitle>
        <OrdersMenu />
        <div className="flex flex-col gap-4">
          <OrdersList />
        </div>
      </DialogContent>
    </Dialog>
  );
};

const OrdersMenu = () => {
  const groupedOrders = useGroupedOrders();
  const { selectedOrdersGroup, setSelectedOrdersGroup, selectedOrderID } =
    useOrdersContext();
  const selectedOrderCount = groupedOrders?.[selectedOrdersGroup]?.length || 0;

  if (selectedOrderID) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild className="w-max">
        <Button variant="outline" className="flex gap-3">
          <span style={{ fontSize: 15 }}>
            {parseOrderGroupName(selectedOrdersGroup)} {selectedOrderCount}
          </span>
          <ChevronDownIcon size={18} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup
          value={""}
          onValueChange={(value) => {
            setSelectedOrdersGroup(value as OrderStatus);
          }}
        >
          {groupedOrders &&
            Object.entries(groupedOrders).map(([key, value]) => {
              return (
                <DropdownMenuRadioItem
                  key={key}
                  value={key}
                  className="cursor-pointer"
                >
                  {parseOrderGroupName(key)} {value.length}
                </DropdownMenuRadioItem>
              );
            })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const useToken = (tokenAddress?: string) => {
  const { data } = useTokensList();

  return useMemo(
    () => data?.find((it) => eqIgnoreCase(it.address, tokenAddress || "")),
    [data, tokenAddress]
  );
};

const getOrderTitle = (order: Order) => {
  switch (order.orderType) {
    case OrderType.LIMIT:
      return "Limit";
    case OrderType.TWAP_MARKET:
      return "TWAP Market";
    case OrderType.TWAP_LIMIT:
      return "TWAP Limit";

    default:
      break;
  }
};

const useCancelOrder = () => {
  const { twapSDK } = useTwapContext();
  const { refetch } = useOrdersQuery();
  const {address: account} = useAccount()
  return useMutation({
    mutationFn: async (orderID: number) => {
      twapSDK.analytics.onCancelOrderRequest(orderID);
      const simulatedData = await simulateContract(wagmiConfig, {
        abi: TwapAbi,
        functionName: "cancel",
        address: twapSDK.config.twapAddress as any,
        account,
        args: [orderID],
      });

      const hash = await writeContract(wagmiConfig, simulatedData.request);
      await waitForConfirmations(hash, 1, 20);
      await getTransactionReceipt(wagmiConfig, {
        hash,
      });
      twapSDK.analytics.onCancelOrderSuccess();
      await refetch();
    },
    onError: (error) => {
      
      twapSDK.analytics.onCancelOrderError(error);
    },
  });
};


const CancelOrderButton = ({ order }: { order: Order }) => {
  const {isPending, mutate}  =useCancelOrder();
  return <Button className='w-full mt-4' disabled={isPending} onClick={() => mutate(order.id)}>Cancel order</Button>
}

const SelectedOrder = () => {
  const { data } = useOrdersQuery();
  const { selectedOrderID } = useOrdersContext();

  const order = useMemo(
    () => data?.find((it) => it.id === selectedOrderID),
    [data, selectedOrderID]
  );
  const inToken = useToken(order?.srcTokenAddress);
  const outToken = useToken(order?.dstTokenAddress);

  if (!order) return null;

  return (
    <div>
      <div className="flex justify-between mb-6">
        <p style={{ fontSize: 14 }}>
          #{order.id} {getOrderTitle(order)}
        </p>
        <p className="capitalize" style={{ fontSize: 14 }}>
          {order.status}
        </p>
      </div>
      <div className="flex flex-col gap-7">
        <SelectedOrderToken token={inToken} title="Sold" />
        <SelectedOrderToken token={outToken} title="To buy" />
        <SelectedOrderDetails
          order={order}
          inToken={inToken}
          outToken={outToken}
        />
      </div>
      {order.status === OrderStatus.Open && <CancelOrderButton order={order} />}
    </div>
  );
};

const SelectedOrderToken = ({
  token,
  title,
}: {
  token?: Token;
  title: string;
}) => {
  if (!token) {
    return <Skeleton />;
  }
  return (
    <div className="w-full flex justify-between items-center">
      <div className="flex flex-col gap-2">
        <p style={{ fontSize: 14 }}>{title}</p>
        <p style={{ fontSize: 18 }}>{token.symbol}</p>
      </div>

      <Avatar style={{ width: 36, height: 36 }}>
        <AvatarImage src={token.logoUrl} alt={token.symbol} />
        <AvatarFallback className="bg-slate-200 dark:bg-slate-700">
          {token.symbol.charAt(0)}
        </AvatarFallback>
      </Avatar>
    </div>
  );
};

const OrdersList = () => {
  const groupedOrders = useGroupedOrders();
  const { selectedOrdersGroup, selectedOrderID } = useOrdersContext();
  const orders = groupedOrders?.[selectedOrdersGroup] || [];

  if (selectedOrderID) {
    return <SelectedOrder />;
  }

  return (
    <>
      <Virtuoso
        style={{ height: "400px" }}
        totalCount={orders.length}
        itemContent={(index) => {
          const order = orders[index];
          return <OrdersListItem order={order} />;
        }}
      />
    </>
  );
};

const OrdersListItem = ({ order }: { order: Order }) => {
  const inToken = useToken(order.srcTokenAddress);
  const outToken = useToken(order.dstTokenAddress);
  const { setSelectedOrderID } = useOrdersContext();
  return (
    <div className="pb-2" onClick={() => setSelectedOrderID(order.id)}>
      <Card
        className={cn(
          "bg-slate-50 dark:bg-slate-900 flex gap-4 flex-col items-start h-full justify-fle cursor-pointer p-3  dark:hover:bg-slate-800"
        )}
      >
        <div className="flex justify-between items-center w-full">
          <p style={{ fontSize: 14 }}>
            # {order.id} - {getOrderTitle(order)}
          </p>
          <p style={{ fontSize: 12 }} className="capitalize">
            {order.status}
          </p>
        </div>
        <div className="flex items-center justify-start gap-3">
          <OrdersListItemToken token={inToken} />
          <ArrowRightIcon size={16} />
          <OrdersListItemToken token={outToken} />
        </div>
      </Card>
    </div>
  );
};

const OrdersListItemToken = ({ token }: { token?: Token }) => {
  if (!token) {
    return <Skeleton style={{ width: 26, height: 26, borderRadius: "50%" }} />;
  }
  return (
    <div className="flex justify-start items-center gap-3">
      <Avatar style={{ width: 26, height: 26 }}>
        <AvatarImage src={token.logoUrl} alt={token.symbol} />
        <AvatarFallback className="bg-slate-200 dark:bg-slate-700">
          {token.symbol.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <p style={{ fontSize: 14 }}>{token.symbol}</p>
    </div>
  );
};

const OrdersButton = () => {
  const { setIsOpen } = useOrdersContext();
  const { isLoading } = useOrdersQuery();
  const openOrdersLength = useGroupedOrders()?.open?.length || 0;

  const onOpen = useCallback(() => {
    if (isLoading) return;
    setIsOpen(true);
  }, [isLoading, setIsOpen]);

  return (
    <Card
      onClick={onOpen}
      style={{ height: 50 }}
      className={cn(
        "bg-slate-50 dark:bg-slate-900 pt-2 pb-2 pl-2 pr-2 flex gap-4 flex-row items-center h-full justify-between cursor-pointer mt-3"
      )}
    >
      <p>
        {isLoading ? "Loading orders..." : `${openOrdersLength} open orders`}
      </p>
      <ArrowRightIcon />
    </Card>
  );
};

const parseOrderGroupName = (name: string) => {
  switch (name) {
    case OrderStatus.Open:
      return "Open";
    case OrderStatus.All:
      return "All";
    case OrderStatus.Completed:
      return "Completed";
    case OrderStatus.Expired:
      return "Expired";
    case OrderStatus.Canceled:
      return "Canceled";
    default:
      return name;
  }
};

export const SelectedOrderDetails = ({
  order,
  inToken,
  outToken,
}: {
  order: Order;
  inToken?: Token;
  outToken?: Token;
}) => {
  const amountSent = useToExactAmount(order.srcFilledAmount, inToken?.decimals);
  const amountOut = useToExactAmount(order.srcAmount, inToken?.decimals);
  const explorer = useExplorer();

  const amountReceived = useToExactAmount(
    order.dstFilledAmount,
    outToken?.decimals
  );

  const executionPrice = useMemo(() => {
    if (!inToken || !outToken) return;
    return order.getExcecutionPrice(inToken.decimals, outToken.decimals);
  }, [inToken, outToken]);

  const limitPrice = useMemo(() => {
    if (!inToken || !outToken) return;
    const price = order.getLimitPrice(inToken.decimals, outToken.decimals);
    if (!price) return "-";
    return `1 ${inToken.symbol} = ${format.crypto(Number(price))} ${
      outToken.symbol
    }`;
  }, [inToken, outToken]);

  return (
    <RadixAccordion.Root type="single">
      <RadixAccordion.Item
        value="item-1"
        className="w-full bg-slate-50 dark:bg-slate-900 flex flex-col"
      >
        <RadixAccordion.Header>
          <RadixAccordion.Trigger className="AccordionTrigger w-full p-3">
            <div className="flex flex-row w-full justify-between">
              <span>Execution summary</span>
              <ChevronDownIcon
                size={20}
                className="AccordionChevron"
                aria-hidden
              />
            </div>
          </RadixAccordion.Trigger>
        </RadixAccordion.Header>
        <RadixAccordion.Content className="flex flex-col gap-2 p-3 pb-0 pt-0">
          <OrderDetails.Detail title="Status">
            <p className="capitalize">{order.status}</p>
          </OrderDetails.Detail>

          <OrderDetails.Detail title="Amount sent">
            <p>
              {amountSent
                ? `${format.crypto(Number(amountSent))} ${inToken?.symbol}`
                : ` - ${inToken?.symbol}`}
            </p>
          </OrderDetails.Detail>
          <OrderDetails.Detail title="Amount Rceived">
            <p>
              {amountReceived
                ? `${format.crypto(Number(amountReceived))} ${outToken?.symbol}`
                : ` - ${outToken?.symbol}`}
            </p>
          </OrderDetails.Detail>
          <OrderDetails.Detail title="Progress">
            <p>{`${order.progress}%`}</p>
          </OrderDetails.Detail>
          <OrderDetails.Detail title="Avg. execution price">
            <p>
              {executionPrice
                ? `${format.crypto(Number(executionPrice))}`
                : "-"}
            </p>
          </OrderDetails.Detail>
          <div className="mt-2"></div>
        </RadixAccordion.Content>
      </RadixAccordion.Item>
      <RadixAccordion.Item
        value="item-2"
        className="w-full bg-slate-50 dark:bg-slate-900 flex flex-col mt-5"
      >
        <RadixAccordion.Header>
          <RadixAccordion.Trigger className="AccordionTrigger w-full p-3">
            <div className="flex flex-row w-full justify-between">
              <span>Order info</span>
              <ChevronDownIcon
                size={20}
                className="AccordionChevron"
                aria-hidden
              />
            </div>
          </RadixAccordion.Trigger>
        </RadixAccordion.Header>
        <RadixAccordion.Content className="flex flex-col gap-2 p-3 pt-0 pb-0">
          {!order.isMarketOrder && (
            <OrderDetails.Detail title="Limit price">
              <p>{limitPrice}</p>
            </OrderDetails.Detail>
          )}

          <OrderDetails.Detail title="created at">
            <p>{moment(order.createdAt).format("DD/MM/YY HH:mm")} UTC</p>
          </OrderDetails.Detail>
          <OrderDetails.Deadline deadline={order.deadline} />
          <OrderDetails.Detail title="Amount out">
            <p>{`${
              amountOut
                ? `${format.crypto(Number(amountOut))} ${inToken?.symbol}`
                : `- ${inToken?.symbol}`
            }`}</p>
          </OrderDetails.Detail>
          {order.totalChunks && (
            <OrderDetails.TradeSize
              inToken={inToken}
              srcChunkAmount={order.srcBidAmount}
            />
          )}
          {order.totalChunks > 1 && (
            <OrderDetails.Detail title="No. of trades">
              <p>{order.totalChunks}</p>
            </OrderDetails.Detail>
          )}
          {!order.isMarketOrder && (
            <OrderDetails.MinReceived
              outToken={outToken}
              destTokenMinAmount={order.dstMinAmount}
            />
          )}
          <OrderDetails.Recepient />
          <OrderDetails.Detail title="Tx hash">
            <a href={`${explorer}/tx/${order.txHash}`} target="_blank">
              {makeElipsisAddress(order.txHash)}
            </a>
          </OrderDetails.Detail>
          <div className="mt-2"></div>
        </RadixAccordion.Content>
      </RadixAccordion.Item>
    </RadixAccordion.Root>
  );
};

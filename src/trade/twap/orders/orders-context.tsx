import { OrderStatus } from "@orbs-network/twap-sdk";
import React, { ReactNode, useState } from "react";

interface ContextType {
  selectedOrderID?: number;
  setSelectedOrderID: (id?: number) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  selectedOrdersGroup: OrderStatus;
    setSelectedOrdersGroup: (group: OrderStatus) => void;
}

const OrdersContext = React.createContext({} as ContextType);

export function OrdersContextProvider({ children }: { children: ReactNode }) {
    const [selectedOrdersGroup, setSelectedOrdersGroup] = useState<OrderStatus>(OrderStatus.All)
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOrderID, setSelectedOrderID] = useState<undefined | number>(
    undefined
  );

  return (
    <OrdersContext.Provider
      value={{ setSelectedOrderID, selectedOrderID, isOpen,selectedOrdersGroup, setSelectedOrdersGroup, setIsOpen }}
    >
      {children}
    </OrdersContext.Provider>
  );
}

export function useOrdersContext() {
  return React.useContext(OrdersContext);
}

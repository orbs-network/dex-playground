import { format, makeElipsisAddress } from "@/lib";
import { useExplorer, useToExactAmount } from "@/trade/hooks";
import { fillDelayText } from "@/trade/twap/utils";
import { Token } from "@/types";
import { TimeDuration } from "@orbs-network/twap-sdk";
import moment from "moment";
import { ReactNode } from "react";
import { useAccount } from "wagmi";
import { Card } from "./ui/card";
import { QuestionHelperTooltip } from "./ui/tooltip";

export const OrderDetails = ({ children }: { children: ReactNode }) => {
  return (
    <Card className="w-full bg-slate-50 dark:bg-slate-900 p-3 flex flex-col gap-2 mt-5">
      {children}
    </Card>
  );
};

const OrderDetail = ({
  title,
  children,
  tooltip,
}: {
  title: string;
  children: ReactNode;
  tooltip?: ReactNode;
}) => {
  return (
    <div className="flex flex-row gap-2 w-full justify-between flex-wrap">
      <div className="flex gap-2 justify-start items-center">
        <p style={{ fontSize: 14 }}> {title}</p>{" "}
        {tooltip && <QuestionHelperTooltip content={tooltip} />}
      </div>
      <div style={{ fontSize: 14 }}>{children}</div>
    </div>
  );
};

const Deadline = ({ deadline }: { deadline?: number }) => {
  return (
    <OrderDetails.Detail
      title="Deadline"
      tooltip="This is the date and time marking the end of the period which you have selected for your order to be executed."
    >
      <div>{moment(deadline).format("DD/MM/YY HH:mm")} UTC</div>
    </OrderDetails.Detail>
  );
};

const TradeSize = ({
  srcChunkAmount,
  inToken,
}: {
  srcChunkAmount?: string;
  inToken?: Token | null;
}) => {
  const amount = useToExactAmount(srcChunkAmount, inToken?.decimals);

  return (
    <OrderDetails.Detail
      title="Individual trade size"
      tooltip="The number of input tokens that will be removed from your balance and swapped for the output token in each individual trade."
    >
      <div>
        {format.crypto(Number(amount))} {inToken?.symbol}
      </div>
    </OrderDetails.Detail>
  );
};

const Chunks = ({ chunks }: { chunks?: number }) => {
  return (
    <OrderDetails.Detail
      title="No. of trades"
      tooltip="The total number of individual trades that will be scheduled as part of your order."
    >
      <div>{chunks}</div>
    </OrderDetails.Detail>
  );
};

const FillDelay = ({ fillDelay }: { fillDelay?: TimeDuration }) => {
  return (
    <OrderDetails.Detail
      title="Every"
      tooltip="The estimated minimum amount of time that will elapse between each trade in your order."
    >
      <div>{fillDelayText(fillDelay)}</div>
    </OrderDetails.Detail>
  );
};

const MinReceived = ({
  destTokenMinAmount,
  outToken,
}: {
  destTokenMinAmount?: string;
  outToken?: Token | null;
}) => {
  const amount = useToExactAmount(destTokenMinAmount, outToken?.decimals);

  return (
    <OrderDetails.Detail
      title="Minimum received"
      tooltip="This is the minimum number of tokens that may be received. NOTE: This minimum only refers to executed trades. Some trades may not be executed if the limit price is higher than the available market prices and your order may only be partially filled."
    >
      <div>
        {format.crypto(Number(amount))} {outToken?.symbol}
      </div>
    </OrderDetails.Detail>
  );
};

const Recepient = () => {
  const { address } = useAccount();
  const explorer = useExplorer();

  return (
    <OrderDetails.Detail title="Recipient">
      <a target="_blank" href={`${explorer}/address/${address}`}>
        {makeElipsisAddress(address)}
      </a>
    </OrderDetails.Detail>
  );
};



OrderDetails.Detail = OrderDetail;
OrderDetails.Deadline = Deadline;
OrderDetails.TradeSize = TradeSize;
OrderDetails.Chunks = Chunks;
OrderDetails.FillDelay = FillDelay;
OrderDetails.MinReceived = MinReceived;
OrderDetails.Recepient = Recepient;

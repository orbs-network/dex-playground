import { ChevronDownIcon } from "lucide-react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Token } from "@/types";
import { Card } from "../ui/card";
import { useMemo, useState } from "react";
import {
  eqIgnoreCase,
  format,
  usePriceUsd,
  useSortedTokens,
  useTokenBalance,
} from "@/lib";
import { useToExactAmount, useToken } from "@/trade/hooks";
import { Skeleton } from "../ui/skeleton";
import { Virtuoso } from "react-virtuoso";
import BN from "bignumber.js";



type TokenSelectProps = {
  selectedToken: Token | undefined;
  onSelectToken: (token: Token) => void;
};

export function TokenSelect({
  selectedToken,
  onSelectToken,
}: TokenSelectProps) {
  const [open, setOpen] = useState(false);
  const tokens = useSortedTokens();
  const [filterInput, setFilterInput] = useState("");
  const token = useToken(filterInput)
  

  const filteredTokens = useMemo(() => {
    if (!filterInput) return tokens || [];
    const res = (
      tokens?.filter(
        (t) =>
          eqIgnoreCase(t.address, filterInput) ||
          t.symbol.toLowerCase().includes(filterInput.toLowerCase())
      ) || []
    );

    return !token ? res : [...res, token]


  }, [tokens, filterInput, token]);



  return (
    <Dialog modal={true} open={open} onOpenChange={(o) => setOpen(o)}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          className="rounded-full flex items-center gap-3 py-7 px-2.5 mix-blend-multiply dark:mix-blend-screen"
          onClick={() => setOpen(true)}
        >
          <Avatar>
            {selectedToken && (
              <AvatarImage
                src={selectedToken.logoUrl}
                alt={selectedToken.symbol}
              />
            )}
            <AvatarFallback className="bg-slate-200 dark:bg-slate-700">
              {selectedToken ? selectedToken.symbol.charAt(0) : "-"}
            </AvatarFallback>
          </Avatar>
          <div className="text-xl">
            {selectedToken ? selectedToken.symbol : "-"}
          </div>
          <ChevronDownIcon className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="lg:max-w-screen-sm h-[80vh] flex flex-col justify-start">
        <DialogHeader>
          <DialogTitle>Select a token</DialogTitle>
          <DialogDescription>
            Select a token from our default list or search for a token by symbol
            or address.
          </DialogDescription>
          <Input
            value={filterInput}
            onChange={(e) => setFilterInput(e.target.value)}
          />
        </DialogHeader>
        <div className="relative flex flex-1 flex-col flex-grow gap-2 overflow-y-scroll pr-3">
          <Virtuoso
            totalCount={filteredTokens?.length}
            overscan={10}
            itemContent={(index) => {
              const token = filteredTokens[index];

              const onSelect = () => {
                onSelectToken(token);
                setOpen(false);
              };

              return <TokenDisplay token={token} onSelect={onSelect} />;
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

const TokenDisplay = ({
  token: t,
  onSelect,
}: {
  token: Token;
  onSelect: () => void;
}) => {
  const { balance, isLoading } = useTokenBalance(t.address);
  const usd = usePriceUsd(t.address).data || 0;
  const balanceUi = useToExactAmount(balance, t.decimals) || "0";
  const usdAmount = BN(balanceUi).multipliedBy(usd).toFixed()
  
  return (
    <Card
      key={t.address}
      className="cursor-pointer p-4 flex items-center justify-between gap-3 mb-3"
      onClick={onSelect}
    >
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src={t.logoUrl} alt={t.symbol} />
          <AvatarFallback className="bg-slate-200 dark:bg-slate-700">
            {t.symbol.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <div>{t.symbol}</div>
          <div className="text-sm text-slate-400">{t.name}</div>
        </div>
      </div>
      {isLoading ? (
        <Skeleton style={{ width: 70, height: 20 }} />
      ) : (
        <div className='flex flex-col items-end'>
          <p>{format.crypto(Number(balanceUi))}</p>
          <p className='opacity-70' style={{fontSize: 13}}>${format.crypto(Number(usdAmount))}</p>
        </div>
      )}
    </Card>
  );
};

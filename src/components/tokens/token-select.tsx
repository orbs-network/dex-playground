import { ChevronDownIcon } from 'lucide-react'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import { Input } from '../ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { Token, TokensWithBalances } from '@/types'
import { Card } from '../ui/card'
import { useMemo, useState } from 'react'
import BN from 'bignumber.js'
import { amountUi } from '@/lib/utils'

type TokenSelectProps = {
  selectedToken: Token
  tokens: TokensWithBalances
  onSelectToken: (token: Token) => void
}

export function TokenSelect({
  selectedToken,
  tokens,
  onSelectToken,
}: TokenSelectProps) {
  const [open, setOpen] = useState(false)

  const SortedTokens = useMemo(() => {
    return Object.values(tokens)
      .sort(
        (a, b) =>
          Number(amountUi(b.token.decimals, b.balance.toString())) -
          Number(amountUi(a.token.decimals, a.balance.toString()))
      )
      .map((t) => (
        <Card
          key={t.token.address}
          className="cursor-pointer p-4 flex items-center justify-between gap-3"
          onClick={() => {
            onSelectToken(t.token)
            setOpen(false)
          }}
        >
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={t.token.logoUrl} alt={t.token.symbol} />
              <AvatarFallback className="bg-slate-200 dark:bg-slate-700">
                {t.token.symbol.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <div>{t.token.symbol}</div>
              <div className="text-sm text-slate-400">{t.token.name}</div>
            </div>
          </div>
          <div>
            {BN(t.balance.toString()).shiftedBy(-t.token.decimals).toFixed(5)}
          </div>
        </Card>
      ))
  }, [onSelectToken, tokens])

  return (
    <Dialog modal={true} open={open} onOpenChange={(o) => setOpen(o)}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          className="rounded-full flex items-center gap-3 py-7 px-2.5 mix-blend-multiply dark:mix-blend-screen"
          onClick={() => setOpen(true)}
        >
          <Avatar>
            <AvatarImage
              src={selectedToken.logoUrl}
              alt={selectedToken.symbol}
            />
            <AvatarFallback className="bg-slate-200 dark:bg-slate-700">
              {selectedToken.symbol.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="text-xl">{selectedToken.symbol}</div>
          <ChevronDownIcon className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="lg:max-w-screen-sm max-h-[80vh] flex flex-col justify-start">
        <DialogHeader>
          <DialogTitle>Select a token</DialogTitle>
          <DialogDescription>
            Select a token from our default list or search for a token by symbol
            or address.
          </DialogDescription>
          <Input />
        </DialogHeader>
        <div className="relative flex flex-1 flex-col flex-grow gap-2 overflow-y-scroll pr-3">
          {SortedTokens}
        </div>
      </DialogContent>
    </Dialog>
  )
}

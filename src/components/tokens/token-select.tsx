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
import { Token } from '@/types'
import { Card } from '../ui/card'
import { useState } from 'react'

type TokenSelectProps = {
  selectedToken: Token
  tokens: Token[]
  onSelectToken: (token: Token) => void
}

export function TokenSelect({
  selectedToken,
  tokens,
  onSelectToken,
}: TokenSelectProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog modal={true} open={open} onOpenChange={(o) => setOpen(o)}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          className="rounded-full flex items-center gap-3 py-7 px-2.5"
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
          {tokens.map((t) => (
            <Card
              className="cursor-pointer p-4 flex items-center gap-3"
              onClick={() => {
                onSelectToken(t)
                setOpen(false)
              }}
            >
              <Avatar>
                <AvatarImage src={t.logoUrl} alt={t.symbol} />
                <AvatarFallback className="bg-slate-200 dark:bg-slate-700">
                  {t.symbol.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {t.name}
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

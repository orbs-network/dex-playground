import { ArrowUpDownIcon } from 'lucide-react'
import { Button } from './button'

type SwitchButtonProps = {
  onClick?: () => void
}

export function SwitchButton({ onClick }: SwitchButtonProps) {
  return (
    <Button
      className="rounded-full shadow"
      variant="outline"
      size="icon"
      onClick={onClick}
    >
      <ArrowUpDownIcon className="h-5 w-5" />
    </Button>
  )
}

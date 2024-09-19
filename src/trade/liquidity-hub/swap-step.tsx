import { cn } from '@/lib/utils'
import {
  CircleAlertIcon,
  CircleCheckBigIcon,
  CircleIcon,
  HourglassIcon,
} from 'lucide-react'
import { SwapStepItem, SwapStepStatus } from './useSwapStore'

export function SwapStep({ label, status }: SwapStepItem) {
  let Icon = <CircleIcon size={16} />
  let color = ''

  switch (status) {
    case SwapStepStatus.Complete:
      Icon = <CircleCheckBigIcon className="text-green-500" size={16} />
      color = 'text-slate-100'
      break
    case SwapStepStatus.Loading:
      Icon = (
        <HourglassIcon
          className="transition-transform ease-in-out animate-spin"
          size={16}
        />
      )
      color = 'text-slate-400'
      break
    case SwapStepStatus.Error:
      Icon = <CircleAlertIcon className="text-red-500" size={16} />
      color = 'text-red-500'
      break
  }

  return (
    <div className={cn('flex items-center gap-2', color)}>
      <div>{label}</div>
      {Icon}
    </div>
  )
}

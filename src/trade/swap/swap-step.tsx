import { cn } from '@/lib/utils'
import {
  CircleAlertIcon,
  CircleCheckBigIcon,
  CircleIcon,
  HourglassIcon,
} from 'lucide-react'
import { Steps } from './liquidity-hub/types'

type SwapStepProps = {
  step: Steps
  isCurrent: boolean
  isSuccess: boolean
  isFailed: boolean
}

export function SwapStep({
  step,
  isCurrent,
  isSuccess,
  isFailed,
}: SwapStepProps) {
  let Icon = <CircleIcon size={16} />
  let color = ''

  if (isSuccess) {
    Icon = <CircleCheckBigIcon className="text-green-500" size={16} />
    color = 'text-slate-100'
  } else if (isCurrent) {
    Icon = (
      <HourglassIcon
        className="transition-transform ease-in-out animate-spin"
        size={16}
      />
    )
    color = 'text-slate-400'
  } else if (isFailed) {
    Icon = <CircleAlertIcon className="text-red-500" size={16} />
    color = 'text-red-500'
  }

  return (
    <div className={cn('flex items-center gap-2', color)}>
      <div>{step.toString()}</div>
      {Icon}
    </div>
  )
}

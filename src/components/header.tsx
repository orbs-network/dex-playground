import { ThemeToggle } from '@/components/theme-toggle'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export function Header() {
  return (
    <div className="p-4 flex w-full justify-between items-center">
      <ThemeToggle />
      <ConnectButton />
    </div>
  )
}

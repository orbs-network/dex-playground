import { ThemeToggle } from '@/components/theme-toggle'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export function Header() {
  return (
    <div className="p-4 flex w-full justify-between items-center fixed bg-slate-950 shadow">
      <div className="flex gap-2 items-center">
        <img src="/orbslogo.svg" className="w-6 h-6" />
        <span>Orbs Demo</span>
      </div>
      <div className="flex gap-4">
        <ThemeToggle />
        <ConnectButton />
      </div>
    </div>
  )
}

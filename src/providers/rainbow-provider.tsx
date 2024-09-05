import {
  darkTheme,
  lightTheme,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit'
import { useTheme } from './theme-provider'

export function RainbowProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()

  return (
    <RainbowKitProvider
      modalSize="compact"
      theme={theme === 'light' ? lightTheme() : darkTheme()}
    >
      {children}
    </RainbowKitProvider>
  )
}

import {
  darkTheme,
  lightTheme,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit'
import { Theme, useTheme } from './theme-provider'

function getThemeMode(theme: Theme) {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }

  return theme
}

export function RainbowProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme()

  const mode = getThemeMode(theme)

  return (
    <RainbowKitProvider
      modalSize="compact"
      theme={mode === 'light' ? lightTheme() : darkTheme()}
    >
      {children}
    </RainbowKitProvider>
  )
}

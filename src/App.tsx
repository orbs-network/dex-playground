import { Header } from '@/components/header'
import {
  darkTheme,
  lightTheme,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit'
import { useTheme } from './providers/theme-provider'

export function App() {
  const { theme } = useTheme()
  return (
    <RainbowKitProvider
      modalSize="compact"
      theme={theme === 'light' ? lightTheme() : darkTheme()}
    >
      <Header />
    </RainbowKitProvider>
  )
}

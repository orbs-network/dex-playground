import { App } from './App'
import { ThemeProvider } from './providers/theme-provider'

function Root() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <App />
    </ThemeProvider>
  )
}

export default Root

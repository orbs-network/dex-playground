import { Header } from '@/components/header'
import { Trade } from './trade/trade'

export function App() {
  return (
    <>
      <Header />
      <div className="flex justify-center h-full py-32">
        <Trade />
      </div>
    </>
  )
}

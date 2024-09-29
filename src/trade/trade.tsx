import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Swap as SwapLiquidityHub } from './swap/liquidity-hub/swap'
import { SwapTwap } from './swap/twap/swap-twap'

export function Trade() {
  return (
    <div className="max-w-lg w-full px-4">
      <h1 className="text-5xl font-bold mb-8">Trade</h1>

      <Tabs defaultValue="twap" className="w-full">
        <TabsList>
          <TabsTrigger value="swap">Swap</TabsTrigger>
          <TabsTrigger value="twap">TWAP</TabsTrigger>
          <TabsTrigger value="limit">Limit</TabsTrigger>
        </TabsList>
        <TabsContent value="swap">
          <SwapLiquidityHub />
        </TabsContent>
        <TabsContent value="twap">
          <SwapTwap />
        </TabsContent>
        <TabsContent value="limit">
          <div className="w-full rounded-lg bg-gray-100 dark:bg-gray-800 p-4 mt-4">
            dLimit by Orbs
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Swap } from './liquidity-hub/liquidity-hub-swap'
import { Twap } from './twap/twap'

export function Trade() {
  return (
    <div className="max-w-lg w-full px-4">
      <h1 className="text-5xl font-bold mb-8">Trade</h1>

      <Tabs defaultValue="swap" className="w-full">
        <TabsList>
          <TabsTrigger value="swap">Swap</TabsTrigger>
          <TabsTrigger value="twap">TWAP</TabsTrigger>
          <TabsTrigger value="limit">Limit</TabsTrigger>
        </TabsList>
        <TabsContent value="swap">
          <Swap />
        </TabsContent>
        <TabsContent value="twap">
          <Twap />
        </TabsContent>
        <TabsContent value="limit">
        <Twap isLimitPanel={true} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

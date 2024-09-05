import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function Trade() {
  return (
    <div className="max-w-lg w-full px-4">
      <h1 className="text-5xl font-bold mb-8">Trade</h1>

      <Tabs defaultValue="swap" className="w-full">
        <TabsList>
          <TabsTrigger value="swap">Swap</TabsTrigger>
          <TabsTrigger value="twap">TWAP</TabsTrigger>
        </TabsList>
        <TabsContent value="swap">
          <div className="w-full rounded-lg bg-gray-100 dark:bg-gray-800 p-4 mt-4">
            Swap with Liquidity Hub by Orbs
          </div>
        </TabsContent>
        <TabsContent value="twap">
          <div className="w-full rounded-lg bg-gray-100 dark:bg-gray-800 p-4 mt-4">
            Twap by Orbs
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

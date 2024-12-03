import { Header } from '@/components/header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { SwapLiquidityHub } from './trade/liquidity-hub/liquidity-hub-swap';
import { Settings } from './trade/settings';
import { SwapTwap, SwapLimit } from './trade/twap/twap';

export function App() {
  return (
    <>
      <Header />
      <div className="flex justify-center h-full py-32">
        <div className="max-w-lg w-full px-4">
          <h1 className="text-5xl font-bold mb-8">Trade</h1>
          <Settings />
          <Tabs defaultValue="swap" className="w-full">
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
              <SwapLimit />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}

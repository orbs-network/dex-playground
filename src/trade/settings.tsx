import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { useAppState } from '@/store';
import { DeleteIcon, SettingsIcon } from 'lucide-react';

const PartnerSelector = () => {
  const { partner, setPartner } = useAppState();
  return (
    <div className="flex items-center gap-2 flex-1">
      <Input value={partner} onChange={(e) => setPartner(e.target.value)} />
      <DeleteIcon className="w-6 h-6 cursor-pointer" onClick={() => setPartner('widget')} />
    </div>
  );
};

const RpcUrlSelector = () => {
  const { rpcUrl, setRpcUrl } = useAppState();
  return ( 
    <div className="flex items-center gap-2 flex-1">
      <Input value={rpcUrl} onChange={(e) => setRpcUrl(e.target.value)} />
      <DeleteIcon className="w-6 h-6 cursor-pointer" onClick={() => setRpcUrl('')} />
    </div>
  );
};
export const Settings = () => {
  const { slippage, setSlippage, isLiquidityHubOnly, setLiquidityHubOnly } = useAppState();
  return (
    <div className="flex justify-end w-full" >
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon">
            <SettingsIcon className="w-5 h-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[100vw] max-w-[400px]">
          <div className="flex flex-col gap-4">
            <div className="flex gap-4 items-center justify-between">
              <Label htmlFor="slippage">Slippage</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="slippage"
                  type="number"
                  onChange={(e) => setSlippage(e.target.valueAsNumber)}
                  value={slippage}
                  step={0.1}
                  className="text-right w-16 [&::-webkit-inner-spin-button]:appearance-none p-2 h-7"
                />
                <div>%</div>
              </div>
            </div>
            <div className="flex gap-4 items-center justify-between">
              <Label htmlFor="partner">Partner</Label>
              <PartnerSelector />
            </div>
            <div className="flex gap-4 items-center justify-between">
              <Label htmlFor="rpcUrl">RPC URL</Label>
              <RpcUrlSelector />
            </div>
            <div className="flex gap-4 items-center justify-between">
              <Label htmlFor="slippage">Liquidity Hub only</Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={isLiquidityHubOnly}
                  onCheckedChange={() => setLiquidityHubOnly(!isLiquidityHubOnly)}
                />
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

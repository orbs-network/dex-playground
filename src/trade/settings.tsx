import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAppState } from "@/store";
import { SettingsIcon } from "lucide-react";

export const Settings = () => {
  const { slippage, setSlippage } = useAppState();
  return (
    <div className="flex justify-end">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon">
            <SettingsIcon className="w-5 h-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent>
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
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

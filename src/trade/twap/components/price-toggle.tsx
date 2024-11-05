import { Switch } from "@/components/ui/switch";
import{ useCallback } from "react";
import { useTwapContext } from "../context";

export function PriceToggle() {
  const {
    isMarketOrder,
    state: { updateState },
    isLimitPanel
  } = useTwapContext();

  const onMarketOrderChange = useCallback((isMarketOrder: boolean) => {
    updateState({ isMarketOrder });
  }, []);

  if(isLimitPanel) return null;
  return (
    <div className="flex gap-4 justify-end mb-2">
      <div className="flex gap-2">
        <div>Market order</div>
        <Switch
          checked={!isMarketOrder}
          onCheckedChange={(checked) => onMarketOrderChange(!checked)}
        />
        <div>Limit order</div>
      </div>
    </div>
  );
}
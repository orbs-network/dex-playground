import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib";
import { TimeDuration, TimeUnit } from "@orbs-network/twap-sdk";
import { useMemo } from "react";
import { NumericFormat } from "react-number-format";

const options: { text: string; unit: TimeUnit }[] = [
  {
    text: "Minutes",
    unit: TimeUnit.Minutes,
  },
  {
    text: "Hours",
    unit: TimeUnit.Hours,
  },
  {
    text: "Days",
    unit: TimeUnit.Days,
  },
];



export function FillDelay({
  fillDelay,
  onChange,
}: {
  fillDelay: TimeDuration;
  onChange: (fillDelay: TimeDuration) => void;
}) {

  const text = useMemo(
    () => options.find((it) => it.unit === fillDelay.unit),
    [fillDelay.unit]
  )?.text;
  return (
    <div className='flex flex-col gap-2'>
      <p>Every</p>
      <Card
      className={cn(
        "bg-slate-50 dark:bg-slate-900 pt-2 pb-2 pl-2 pr-2 flex gap-4 flex-row items-center"
      )}
    >
      <NumericFormat
        className="bg-transparent w-full min-w-0 outline-none"
        value={fillDelay.value}
        placeholder="0.00"
        contentEditable={true}
        decimalScale={5}
        readOnly={false}
        thousandSeparator={true}
        onValueChange={(values, sourceInfo) => {
          if (sourceInfo.source !== "event") return;
          onChange({ ...fillDelay, value: Number(values.value) });
        }}
      />
      <div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <span>{text}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup
              value={fillDelay.unit.toString()}
              onValueChange={(value) =>
                onChange({ ...fillDelay, unit: Number(value) })
              }
            >
              {options.map((option) => {
                return (
                  <DropdownMenuRadioItem
                    key={option.unit}
                    value={option.unit.toString()}
                  >
                    {option.text}
                  </DropdownMenuRadioItem>
                );
              })}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
    </div>
  );
}

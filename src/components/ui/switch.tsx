import * as RadixSwitch from "@radix-ui/react-switch";
import { clsx } from "clsx";

export const Switch = ({
  label,
  isChecked,
  onChange,
  className = ''
}: {
  label?: string;
  isChecked: boolean;
  onChange: () => void;
  className?: string;
}) => {
  return (
    <div className={clsx("flex items-center space-x-2", className)}>
      {label && (
        <label className="text-sm font-medium white" htmlFor="airplane-mode">
          {label}
        </label>
      )}
      <RadixSwitch.Root
        className={`relative inline-flex items-center h-6 w-11 rounded-full 
                    transition-colors duration-200 ease-in-out ${
                      isChecked ? "bg-slate-700" : "bg-slate-500"
                    }`}
        id="airplane-mode"
        checked={isChecked}
        onCheckedChange={onChange}
      >
        <RadixSwitch.Thumb
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow 
                      transition-transform duration-200 ease-in-out ${
                        isChecked ? "translate-x-5" : "translate-x-1"
                      }`}
        />
      </RadixSwitch.Root>
    </div>
  );
};

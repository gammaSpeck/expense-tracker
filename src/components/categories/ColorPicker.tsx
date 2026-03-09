import { cn } from "@/lib/utils";
import { CATEGORY_COLORS } from "@/db/expenseTrackerDb";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="grid grid-cols-9 gap-2 p-2 bg-muted/30 rounded-lg">
      {CATEGORY_COLORS.map((color) => {
        const isSelected = value === color;

        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={cn(
              "w-7 h-7 rounded-full transition-all duration-200",
              isSelected &&
                "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110",
            )}
            style={{ backgroundColor: color }}
          />
        );
      })}
    </div>
  );
}

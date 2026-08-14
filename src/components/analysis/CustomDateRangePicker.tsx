import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DateRange } from "@/types/expense";

interface DatePickerFieldProps {
  label: string;
  date: Date | undefined;
  placeholder: string;
  onSelect: (date: Date) => void;
}

function DatePickerField({ label, date, placeholder, onSelect }: DatePickerFieldProps) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal text-sm",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="h-4 w-4" />
            {date ? format(date, "PP") : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => d && onSelect(d)}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface CustomDateRangePickerProps {
  customRange: DateRange | undefined;
  setCustomRange: (updater: (prev: DateRange | undefined) => DateRange | undefined) => void;
}

export function CustomDateRangePicker({ customRange, setCustomRange }: CustomDateRangePickerProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <DatePickerField
        label="Start Date"
        date={customRange?.start}
        placeholder="Pick start"
        onSelect={(date) => setCustomRange((prev) => ({ start: date, end: prev?.end || date }))}
      />
      <DatePickerField
        label="End Date"
        date={customRange?.end}
        placeholder="Pick end"
        onSelect={(date) => setCustomRange((prev) => ({ start: prev?.start || date, end: date }))}
      />
    </div>
  );
}

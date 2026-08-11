import { Controller, useFormContext } from "react-hook-form";
import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ExpenseFormData } from "@/types/expense";

export function DateTimeFields() {
  const { control, register } = useFormContext<ExpenseFormData>();

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label>Date</Label>
        <Controller
          control={control}
          name="date"
          render={({ field }) => (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  aria-label="Date"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal text-sm",
                    !field.value && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {field.value ? format(new Date(field.value), "PP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value ? new Date(field.value) : undefined}
                  onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                  autoFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          )}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="time">Time</Label>
        <div className="relative">
          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input id="time" type="time" className="pl-10 text-sm" {...register("time")} />
        </div>
      </div>
    </div>
  );
}

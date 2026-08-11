import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimePeriod, DateRange } from "@/types/expense";
import { PeriodNav } from "./PeriodNav";
import { CustomDateRangePicker } from "./CustomDateRangePicker";

interface PeriodSelectorProps {
  periodTab: TimePeriod;
  onPeriodChange: (value: string) => void;
  periodDisplay: string;
  goToPreviousPeriod: () => void;
  goToNextPeriod: () => void;
  customRange: DateRange | undefined;
  setCustomRange: (updater: (prev: DateRange | undefined) => DateRange | undefined) => void;
  excludeAdhoc: boolean;
  setExcludeAdhoc: (value: boolean) => void;
}

export function PeriodSelector({
  periodTab,
  onPeriodChange,
  periodDisplay,
  goToPreviousPeriod,
  goToNextPeriod,
  customRange,
  setCustomRange,
  excludeAdhoc,
  setExcludeAdhoc,
}: PeriodSelectorProps) {
  return (
    <div
      className="space-y-3 p-4 bg-card rounded-xl border border-border/50 animate-slide-in-up"
      style={{ animationDelay: "50ms", animationFillMode: "backwards" }}
    >
      {/* Tabs */}
      <Tabs value={periodTab} onValueChange={onPeriodChange}>
        <TabsList className="w-full">
          <TabsTrigger value="week" className="flex-1">
            Week
          </TabsTrigger>
          <TabsTrigger value="month" className="flex-1">
            Month
          </TabsTrigger>
          <TabsTrigger value="year" className="flex-1">
            Year
          </TabsTrigger>
          <TabsTrigger value="custom" className="flex-1">
            Custom
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {periodTab !== "custom" && (
        <PeriodNav
          periodDisplay={periodDisplay}
          goToPreviousPeriod={goToPreviousPeriod}
          goToNextPeriod={goToNextPeriod}
        />
      )}

      {periodTab === "custom" && (
        <CustomDateRangePicker customRange={customRange} setCustomRange={setCustomRange} />
      )}

      {/* Exclude Adhoc toggle */}
      <div className="flex items-center justify-between">
        <Label htmlFor="exclude-adhoc" className="cursor-pointer text-sm">
          Exclude Adhoc Expenses
        </Label>
        <Switch id="exclude-adhoc" checked={excludeAdhoc} onCheckedChange={setExcludeAdhoc} />
      </div>
    </div>
  );
}

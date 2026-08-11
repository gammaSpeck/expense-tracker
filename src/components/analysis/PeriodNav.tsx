import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PeriodNavProps {
  periodDisplay: string;
  goToPreviousPeriod: () => void;
  goToNextPeriod: () => void;
}

export function PeriodNav({ periodDisplay, goToPreviousPeriod, goToNextPeriod }: PeriodNavProps) {
  return (
    <div className="flex items-center justify-between">
      <Button
        variant="ghost"
        size="icon"
        onClick={goToPreviousPeriod}
        aria-label="Previous period"
        className="h-9 w-9"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <span className="text-sm font-semibold">{periodDisplay}</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={goToNextPeriod}
        aria-label="Next period"
        className="h-9 w-9"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}

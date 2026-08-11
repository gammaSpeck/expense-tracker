import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TrendGranularity } from "./analysisUtils";

interface TrendGranularitySelectProps {
  trendGranularity: TrendGranularity;
  setTrendGranularity: (g: TrendGranularity) => void;
  granularityOptions: TrendGranularity[];
}

export function TrendGranularitySelect({
  trendGranularity,
  setTrendGranularity,
  granularityOptions,
}: TrendGranularitySelectProps) {
  if (granularityOptions.length <= 1) return null;

  return (
    <Select value={trendGranularity} onValueChange={(v) => setTrendGranularity(v as TrendGranularity)}>
      <SelectTrigger className="w-24 h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {granularityOptions.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {opt.charAt(0).toUpperCase() + opt.slice(1)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

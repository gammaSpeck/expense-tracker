import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetTitle,
} from "@/components/ui/bottom-sheet";
import { CustomDateRangePicker } from "@/components/analysis/CustomDateRangePicker";
import { useCurrency } from "@/contexts/CurrencyContext";
import { DATE_PRESETS, type TransactionFilterState } from "@/lib/transactionFilters";
import type { Category, TagMetadata } from "@/types/expense";
import { cn } from "@/lib/utils";

function FilterChipToggle({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-9 items-center rounded-full px-3 py-2 text-sm transition-colors",
        selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80",
      )}
    >
      {label}
    </button>
  );
}

interface TransactionFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: TransactionFilterState;
  patch: (next: Partial<TransactionFilterState>) => void;
  toggleCategory: (id: string) => void;
  toggleTag: (tag: string) => void;
  onClearAll: () => void;
  categories: Category[];
  tags: TagMetadata[];
  resultCount: number;
  activeCount: number;
}

export function TransactionFilterSheet({
  open,
  onOpenChange,
  state,
  patch,
  toggleCategory,
  toggleTag,
  onClearAll,
  categories,
  tags,
  resultCount,
  activeCount,
}: TransactionFilterSheetProps) {
  const { currency } = useCurrency();
  const [tagQuery, setTagQuery] = useState("");

  const visibleTags =
    tags.length > 8
      ? tags.filter(
          (t) =>
            state.tags.includes(t.tag) ||
            t.tag.toLowerCase().includes(tagQuery.trim().toLowerCase()),
        )
      : tags;

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent aria-describedby={undefined}>
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <BottomSheetTitle className="text-base font-semibold">Filters</BottomSheetTitle>
          <Button variant="ghost" size="sm" onClick={onClearAll} disabled={activeCount === 0}>
            Reset
          </Button>
        </div>
        <BottomSheetDescription className="sr-only">
          Filter transactions by date, category, amount, tag, and ad-hoc status.
        </BottomSheetDescription>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-5">
          <section className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</h3>
            <div className="flex flex-wrap gap-2">
              {DATE_PRESETS.map(({ value, label }) => (
                <FilterChipToggle
                  key={value}
                  label={label}
                  selected={state.datePreset === value}
                  onClick={() => patch({ datePreset: value })}
                />
              ))}
            </div>
            {state.datePreset === "custom" && (
              <CustomDateRangePicker
                customRange={state.customRange}
                setCustomRange={(updater) => patch({ customRange: updater(state.customRange) })}
              />
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Category
            </h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <FilterChipToggle
                  key={category.id}
                  label={category.name}
                  selected={state.categories.includes(category.id)}
                  onClick={() => toggleCategory(category.id)}
                />
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="filter-min-amount">Min</Label>
                <Input
                  id="filter-min-amount"
                  inputMode="decimal"
                  placeholder={currency.symbol}
                  value={state.minAmount}
                  onChange={(e) => patch({ minAmount: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="filter-max-amount">Max</Label>
                <Input
                  id="filter-max-amount"
                  inputMode="decimal"
                  placeholder={currency.symbol}
                  value={state.maxAmount}
                  onChange={(e) => patch({ maxAmount: e.target.value })}
                />
              </div>
            </div>
          </section>

          {tags.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tags</h3>
              {tags.length > 8 && (
                <Input
                  placeholder="Search tags"
                  value={tagQuery}
                  onChange={(e) => setTagQuery(e.target.value)}
                />
              )}
              <div className="flex flex-wrap gap-2">
                {visibleTags.map((t) => (
                  <FilterChipToggle
                    key={t.tag}
                    label={`#${t.tag}`}
                    selected={state.tags.includes(t.tag)}
                    onClick={() => toggleTag(t.tag)}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="filter-exclude-adhoc" className="cursor-pointer text-sm">
                Exclude Adhoc Expenses
              </Label>
              <Switch
                id="filter-exclude-adhoc"
                checked={state.excludeAdhoc}
                onCheckedChange={(v) => patch({ excludeAdhoc: v })}
              />
            </div>
          </section>
        </div>

        <div className="border-t border-border/50 p-4 safe-bottom">
          <Button className="w-full h-11" onClick={() => onOpenChange(false)}>
            Show {resultCount} transaction{resultCount === 1 ? "" : "s"}
          </Button>
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
}

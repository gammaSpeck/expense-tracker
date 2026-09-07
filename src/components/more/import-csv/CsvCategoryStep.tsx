import { useState } from "react";
import { ChevronDown, Lock, Plus, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";
import { CategoryIcon } from "@/components/categories/CategoryIcon";
import { ColumnSelect } from "@/components/more/import-csv/CsvMappingStep";
import { MAX_CSV_PICKER_VALUES } from "@/config";
import type { CsvImportState } from "@/hooks/useCsvImport";
import type { CategoryRule, IgnoreRule } from "@/types/csvImport";
import type { Category } from "@/types/expense";

const USE_DEFAULT = "__default__";
const CREATE = "__create__";

interface ColumnValueCount {
  value: string;
  count: number;
}

function columnValueCounts(rows: string[][], columnIndex: number | null): ColumnValueCount[] {
  if (columnIndex === null) return [];
  const values = rows.map((row) => (row[columnIndex] ?? "").trim()).filter(Boolean);
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].map(([value, count]) => ({ value, count }));
}

function uniqueColumnValues(rows: string[][], columnIndex: number | null): string[] {
  return columnValueCounts(rows, columnIndex).map((c) => c.value);
}

function columnLabel(headers: string[], columnIndex: number | null, fallback: string): string {
  return columnIndex === null ? fallback : headers[columnIndex];
}

function CategoryOptionLabel({ category }: { category: Category }) {
  return (
    <div className="flex items-center gap-2">
      <CategoryIcon icon={category.icon} color={category.color} size="sm" />
      <span>{category.name}</span>
    </div>
  );
}

interface IgnoreRuleValueFieldProps {
  rows: string[][];
  columnIndex: number;
  excludedColumns: (number | null)[];
  value: string;
  onChange: (value: string) => void;
}

/** The searchable dropdown body of IgnoreRuleValueField, split out so the field itself stays
 *  a thin guard-clause dispatcher. */
function ValuePickerPopover({
  value,
  options,
  onSelect,
}: {
  value: string;
  options: ColumnValueCount[];
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className={value ? "truncate" : "text-muted-foreground"}>
            {value || "Value to ignore"}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0">
        <Command>
          <CommandInput placeholder="Search values..." />
          <CommandList>
            <CommandEmpty>No values found.</CommandEmpty>
            {options.map(({ value: option, count }) => (
              <CommandItem
                key={option}
                className="flex items-center justify-between gap-2"
                onSelect={() => {
                  onSelect(option);
                  setOpen(false);
                }}
              >
                <span className="truncate">{option}</span>
                <span className="text-xs text-muted-foreground shrink-0">({count})</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** Free-text for numeric/date columns (too many distinct values for a picker); a searchable
 *  dropdown of the column's actual unique values everywhere else. */
function IgnoreRuleValueField({
  rows,
  columnIndex,
  excludedColumns,
  value,
  onChange,
}: IgnoreRuleValueFieldProps) {
  if (excludedColumns.includes(columnIndex)) {
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Value to ignore"
      />
    );
  }

  const options = columnValueCounts(rows, columnIndex);
  if (options.length > MAX_CSV_PICKER_VALUES) {
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type the exact value to ignore"
      />
    );
  }
  return <ValuePickerPopover value={value} options={options} onSelect={onChange} />;
}

function CategoryValueRow({
  value,
  categoryRules,
  categories,
  setRule,
}: {
  value: string;
  categoryRules: Record<string, CategoryRule>;
  categories: Category[];
  setRule: (sourceValue: string, rule: CategoryRule | undefined) => void;
}) {
  const rule = categoryRules[value];
  const selectValue = !rule
    ? USE_DEFAULT
    : rule.kind === "existing"
      ? `existing:${rule.categoryId}`
      : CREATE;
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm truncate min-w-0 flex-1">{value}</span>
      <span className="text-muted-foreground text-xs">→</span>
      <Select
        value={selectValue}
        onValueChange={(v) => {
          if (v === USE_DEFAULT) setRule(value, undefined);
          else if (v === CREATE) setRule(value, { kind: "create", name: value });
          else setRule(value, { kind: "existing", categoryId: v.slice("existing:".length) });
        }}
      >
        <SelectTrigger className="w-56 shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={USE_DEFAULT}>Use default category</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={`existing:${category.id}`}>
              <CategoryOptionLabel category={category} />
            </SelectItem>
          ))}
          <SelectItem value={CREATE}>{`+ Create "${value}"`}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function CategoryValueList({
  sourceValues,
  categoryRules,
  categories,
  setRule,
}: {
  sourceValues: string[];
  categoryRules: Record<string, CategoryRule>;
  categories: Category[];
  setRule: (sourceValue: string, rule: CategoryRule | undefined) => void;
}) {
  if (sourceValues.length > MAX_CSV_PICKER_VALUES) {
    return (
      <p className="text-xs text-muted-foreground italic">
        This column has {sourceValues.length.toLocaleString()} distinct values — too many to map
        individually. All rows use the default category below; add specific overrides after import
        if needed.
      </p>
    );
  }
  return (
    // Scroll cap tuned to ~5 rows; no design-token step lands near 300px.
    <div className="space-y-2 max-h-75 overflow-y-auto pr-1">
      {sourceValues.map((value) => (
        <CategoryValueRow
          key={value}
          value={value}
          categoryRules={categoryRules}
          categories={categories}
          setRule={setRule}
        />
      ))}
    </div>
  );
}

function CategoryMappingCard({
  sourceValues,
  categoryRules,
  setCategoryRules,
  categories,
}: {
  sourceValues: string[];
  categoryRules: Record<string, CategoryRule>;
  setCategoryRules: (rules: Record<string, CategoryRule>) => void;
  categories: Category[];
}) {
  function setRule(sourceValue: string, rule: CategoryRule | undefined) {
    const next = { ...categoryRules };
    if (rule) next[sourceValue] = rule;
    else delete next[sourceValue];
    setCategoryRules(next);
  }

  return (
    <div className="p-4 rounded-xl bg-card border border-border/50 space-y-3">
      <h3 className="text-sm font-semibold">Category Mapping</h3>
      <p className="text-xs text-muted-foreground">
        Map each unique CSV category value to an ExTrack category.
      </p>
      {sourceValues.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          Map the Category column on the previous step first.
        </p>
      ) : (
        <CategoryValueList
          sourceValues={sourceValues}
          categoryRules={categoryRules}
          categories={categories}
          setRule={setRule}
        />
      )}
    </div>
  );
}

function DefaultCategoryCard({
  categories,
  defaultCategoryId,
  setDefaultCategoryId,
  error,
}: {
  categories: Category[];
  defaultCategoryId: string;
  setDefaultCategoryId: (id: string) => void;
  error?: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-card border border-border/50 space-y-2">
      <p className="text-sm font-medium">Default category</p>
      <Select value={defaultCategoryId} onValueChange={setDefaultCategoryId}>
        <SelectTrigger>
          <SelectValue placeholder="Select default category" />
        </SelectTrigger>
        <SelectContent>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              <CategoryOptionLabel category={category} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" /> {error}
        </p>
      )}
    </div>
  );
}

function LockedRuleHints({
  dateColLabel,
  amountColLabel,
}: {
  dateColLabel: string;
  amountColLabel: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        <span>Skip row if &quot;{dateColLabel}&quot; cell is empty</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        <span>Skip row if &quot;{amountColLabel}&quot; cell is empty</span>
      </div>
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        <span>
          Rows where &quot;{amountColLabel}&quot; or &quot;{dateColLabel}&quot; cannot be parsed are
          reported as data errors, not skipped
        </span>
      </div>
    </div>
  );
}

function IgnoreRuleRow({
  headers,
  rows,
  rule,
  excludedColumns,
  onChange,
  onRemove,
}: {
  headers: string[];
  rows: string[][];
  rule: IgnoreRule;
  excludedColumns: (number | null)[];
  onChange: (patch: Partial<IgnoreRule>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <ColumnSelect
        headers={headers}
        value={rule.columnIndex}
        onChange={(columnIndex) => onChange({ columnIndex: columnIndex ?? 0 })}
      />
      <IgnoreRuleValueField
        rows={rows}
        columnIndex={rule.columnIndex}
        excludedColumns={excludedColumns}
        value={rule.value}
        onChange={(value) => onChange({ value })}
      />
      <button type="button" aria-label="Remove ignore rule" onClick={onRemove}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function IgnoreRulesSection({
  headers,
  rows,
  ignoreRules,
  setIgnoreRules,
  excludedColumns,
  dateColLabel,
  amountColLabel,
}: {
  headers: string[];
  rows: string[][];
  ignoreRules: IgnoreRule[];
  setIgnoreRules: (rules: IgnoreRule[]) => void;
  excludedColumns: (number | null)[];
  dateColLabel: string;
  amountColLabel: string;
}) {
  function updateIgnoreRule(index: number, patch: Partial<IgnoreRule>) {
    setIgnoreRules(ignoreRules.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));
  }

  return (
    <details className="group p-4 rounded-xl bg-card border border-border/50 space-y-3">
      <summary className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        Advanced Rules
      </summary>
      <p className="text-xs text-muted-foreground">Configure which rows to skip during import</p>
      <div className="space-y-2 pt-2">
        <LockedRuleHints dateColLabel={dateColLabel} amountColLabel={amountColLabel} />
        {ignoreRules.map((rule, i) => (
          <IgnoreRuleRow
            key={i}
            headers={headers}
            rows={rows}
            rule={rule}
            excludedColumns={excludedColumns}
            onChange={(patch) => updateIgnoreRule(i, patch)}
            onRemove={() => setIgnoreRules(ignoreRules.filter((_, idx) => idx !== i))}
          />
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIgnoreRules([...ignoreRules, { columnIndex: 0, value: "" }])}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add rule
        </Button>
      </div>
    </details>
  );
}

interface CsvCategoryStepProps {
  csv: CsvImportState;
}

export function CsvCategoryStep({ csv }: CsvCategoryStepProps) {
  if (!csv.parsed) return null;
  const {
    categories,
    categoryRules,
    setCategoryRules,
    defaultCategoryId,
    setDefaultCategoryId,
    ignoreRules,
    setIgnoreRules,
  } = csv;
  const headers = csv.parsed.headers;
  const rows = csv.parsed.rows;
  const sourceValues = uniqueColumnValues(rows, csv.mapping.category);
  const dateColLabel = columnLabel(headers, csv.mapping.dateTime, "Date");
  const amountColLabel = columnLabel(headers, csv.mapping.amount, "Amount");
  const excludedColumns = [csv.mapping.amount, csv.mapping.dateTime, csv.mapping.dateTimeExtra];

  return (
    <div className="space-y-4">
      <CategoryMappingCard
        sourceValues={sourceValues}
        categoryRules={categoryRules}
        setCategoryRules={setCategoryRules}
        categories={categories}
      />

      <DefaultCategoryCard
        categories={categories}
        defaultCategoryId={defaultCategoryId}
        setDefaultCategoryId={setDefaultCategoryId}
        error={csv.mappingErrors.defaultCategory}
      />

      <IgnoreRulesSection
        headers={headers}
        rows={rows}
        ignoreRules={ignoreRules}
        setIgnoreRules={setIgnoreRules}
        excludedColumns={excludedColumns}
        dateColLabel={dateColLabel}
        amountColLabel={amountColLabel}
      />

      <div className="flex justify-between">
        <Button type="button" variant="ghost" onClick={() => csv.goToStep("mapping")}>
          Back
        </Button>
        <Button type="button" onClick={() => csv.goToStep("preview")}>
          Next
        </Button>
      </div>
    </div>
  );
}

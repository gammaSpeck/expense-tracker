import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CsvPreviewTable, type PreviewRow } from "@/components/more/import-csv/CsvPreviewTable";
import type { CsvImportState } from "@/hooks/useCsvImport";
import type { CategoryRule, CsvImportPlan, DraftExpense } from "@/types/csvImport";

const PREVIEW_ROW_COUNT = 20;
const NO_DRAFTS: DraftExpense[] = [];

function lookupName(nameById: Map<string, string>, id: string): string {
  return nameById.get(id) ?? "";
}

function resolveCategoryName(
  categoryKey: string,
  categoryRules: Record<string, CategoryRule>,
  nameById: Map<string, string>,
  defaultCategoryId: string,
): string {
  const rule = categoryRules[categoryKey];
  if (!rule) return lookupName(nameById, defaultCategoryId);
  if (rule.kind === "existing") return lookupName(nameById, rule.categoryId);
  return rule.name;
}

function rowFields(draft: DraftExpense, categoryName: string): string[] {
  return [
    draft.date,
    draft.time,
    String(draft.value),
    categoryName,
    draft.description ?? "",
    ...draft.tags,
  ];
}

function filterPreviewRows(rows: PreviewRow[], query: string): PreviewRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(({ draft, categoryName }) =>
    rowFields(draft, categoryName).some((v) => v.toLowerCase().includes(q)),
  );
}

function SummaryCard({
  label,
  value,
  testId,
  variant,
}: {
  label: string;
  value: number;
  testId: string;
  variant?: "primary" | "warning";
}) {
  const color =
    variant === "primary"
      ? "text-primary"
      : variant === "warning"
        ? "text-yellow-500"
        : "text-foreground";
  return (
    <div className="p-3 rounded-xl bg-card border border-border/50 text-center">
      <p className={`text-2xl font-bold ${color}`} data-testid={testId}>
        {value.toLocaleString()}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function SummaryStats({ plan }: { plan: CsvImportPlan }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <SummaryCard label="Total rows" value={plan.totalRows} testId="csv-stat-total" />
      <SummaryCard
        label="To import"
        value={plan.drafts.length}
        testId="csv-stat-importing"
        variant="primary"
      />
      <SummaryCard
        label="Skipped"
        value={plan.skippedByRules + plan.skippedEmptyField}
        testId="csv-stat-skipped"
      />
      <SummaryCard
        label="Data errors"
        value={plan.errors.length}
        testId="csv-stat-errors"
        variant={plan.errors.length > 0 ? "warning" : undefined}
      />
    </div>
  );
}

function ErrorsDisclosure({ errors }: { errors: CsvImportPlan["errors"] }) {
  if (errors.length === 0) return null;
  return (
    <details
      className="group p-4 rounded-xl bg-card border border-border/50"
      open={errors.length <= 3}
    >
      <summary className="flex items-center gap-2 text-sm font-medium cursor-pointer">
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
        {errors.length} error{errors.length !== 1 ? "s" : ""}
      </summary>
      {/* Scroll cap tuned to ~6 error rows; no design-token step lands near 200px. */}
      <div className="pt-2 space-y-1 max-h-50 overflow-y-auto text-xs">
        {errors.map((error, i) => (
          <p key={i} className="text-muted-foreground">
            Row {error.rowNumber} — {error.field}: could not parse &quot;{error.rawValue}&quot;
          </p>
        ))}
      </div>
    </details>
  );
}

function PreviewSection({
  hasDrafts,
  search,
  setSearch,
  filteredRows,
}: {
  hasDrafts: boolean;
  search: string;
  setSearch: (value: string) => void;
  filteredRows: PreviewRow[];
}) {
  if (!hasDrafts) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No valid rows to import. Check your column mapping and rules.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search preview..."
          className="h-9 text-xs pl-8"
        />
      </div>

      <CsvPreviewTable rows={filteredRows.slice(0, PREVIEW_ROW_COUNT)} />

      {filteredRows.length > PREVIEW_ROW_COUNT && (
        <p className="text-xs text-muted-foreground text-center">
          Showing first {PREVIEW_ROW_COUNT} of {filteredRows.length.toLocaleString()} rows
        </p>
      )}
    </div>
  );
}

interface CsvPreviewStepProps {
  csv: CsvImportState;
}

export function CsvPreviewStep({ csv }: CsvPreviewStepProps) {
  const { plan, categoryRules, categories, defaultCategoryId, isImporting } = csv;

  const nameById = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);
  const rows = useMemo<PreviewRow[]>(
    () =>
      (plan?.drafts ?? NO_DRAFTS).map((draft) => ({
        draft,
        categoryName: resolveCategoryName(
          draft.categoryKey,
          categoryRules,
          nameById,
          defaultCategoryId,
        ),
      })),
    [plan, categoryRules, nameById, defaultCategoryId],
  );
  const [search, setSearch] = useState("");
  const filteredRows = useMemo(() => filterPreviewRows(rows, search), [rows, search]);

  if (!plan) return null;

  return (
    <div className="space-y-4">
      <SummaryStats plan={plan} />
      <ErrorsDisclosure errors={plan.errors} />
      <PreviewSection
        hasDrafts={plan.drafts.length > 0}
        search={search}
        setSearch={setSearch}
        filteredRows={filteredRows}
      />

      <div className="flex justify-between items-center">
        <Button type="button" variant="ghost" onClick={() => csv.goToStep("categories")}>
          Back
        </Button>
        <Button
          type="button"
          data-testid="csv-import-submit"
          disabled={plan.drafts.length === 0 || isImporting}
          onClick={() => void csv.runImport()}
        >
          {isImporting ? "Importing..." : `Import ${plan.drafts.length.toLocaleString()} rows`}
        </Button>
      </div>
    </div>
  );
}

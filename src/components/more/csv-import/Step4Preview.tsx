import { useState, useMemo } from "react";
import { LazyMotion, domAnimation, m } from "framer-motion";
import { CheckCircle2, AlertTriangle, Search } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { db } from "@/db/expenseTrackerDb";
import type { Expense, Category } from "@/types/expense";
import type { DataError } from "./useCsvImport";

interface Props {
  totalRows: number;
  validRows: Expense[];
  skippedByRules: number;
  dataErrors: DataError[];
  categories: Category[];
  onBack: () => void;
  onDone: () => void;
}

function ColorDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full shrink-0"
      style={{ backgroundColor: color }}
    />
  );
}

export default function Step4Preview({
  totalRows,
  validRows,
  skippedByRules,
  dataErrors,
  categories,
  onBack,
  onDone,
}: Props) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const categoryMap = useMemo(() => {
    const m = new Map<string, Category>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return validRows.slice(0, 10);
    const q = search.toLowerCase();
    return validRows
      .filter((r) => {
        const cat = categoryMap.get(r.category);
        return (
          String(r.value).includes(q) ||
          (cat?.name ?? "").toLowerCase().includes(q) ||
          (r.description ?? "").toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q)) ||
          r.date.toLowerCase().includes(q) ||
          r.time.toLowerCase().includes(q)
        );
      })
      .slice(0, 10);
  }, [validRows, search, categoryMap]);

  async function handleImport() {
    setIsImporting(true);
    try {
      await db.expenses.bulkAdd(validRows);

      // Rebuild tag metadata
      const tagCounts = new Map<string, number>();
      for (const exp of validRows) {
        for (const tag of exp.tags) {
          tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
        }
      }

      for (const [tag, count] of tagCounts) {
        const existing = await db.tagMetadata.get(tag);
        if (existing) {
          await db.tagMetadata.update(tag, {
            count: existing.count + count,
            lastUsed: new Date().toISOString(),
          });
        } else {
          await db.tagMetadata.add({ tag, count, lastUsed: new Date().toISOString() });
        }
      }

      setImportedCount(validRows.length);
      setImportDone(true);
      toast.success(`${validRows.length} expenses imported successfully`);
    } catch (err) {
      console.error("Import failed:", err);
      toast.error("Import failed. Some rows may have been partially written.");
    } finally {
      setIsImporting(false);
    }
  }

  if (importDone) {
    return (
      <LazyMotion features={domAnimation}>
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center gap-6 py-8"
        >
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">{importedCount} expenses imported</h3>
            <p className="text-sm text-muted-foreground">Your data has been added successfully.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/transactions")}>
              View Transactions
            </Button>
            <Button onClick={onDone}>Done</Button>
          </div>
        </m.div>
      </LazyMotion>
    );
  }

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4 overflow-x-hidden"
      >
        {/* Summary counts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard label="Total rows" value={totalRows} />
          <SummaryCard label="To import" value={validRows.length} variant="primary" />
          <SummaryCard label="Skipped (rules)" value={skippedByRules} />
          <SummaryCard
            label="Data errors"
            value={dataErrors.length}
            variant={dataErrors.length > 0 ? "warning" : undefined}
          />
        </div>

        {/* Error details */}
        {dataErrors.length > 0 && (
          <Collapsible defaultOpen={dataErrors.length <= 3}>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium w-full group">
              <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
              <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
              {dataErrors.length} error{dataErrors.length !== 1 ? "s" : ""}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="space-y-1 max-h-[200px] overflow-y-auto text-xs">
                {dataErrors.map((e, i) => (
                  <p key={i} className="text-muted-foreground">
                    Row {e.rowIndex + 1} — {e.field}: could not parse &ldquo;{e.rawValue}&rdquo;
                  </p>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Preview table */}
        {validRows.length > 0 && (
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

            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sticky left-0 z-10 bg-card whitespace-nowrap min-w-[140px]">
                      Category
                    </TableHead>
                    <TableHead className="text-xs whitespace-nowrap">Description</TableHead>
                    <TableHead className="text-xs whitespace-nowrap">Tags</TableHead>
                    <TableHead className="text-xs whitespace-nowrap">Amount</TableHead>
                    <TableHead className="text-xs whitespace-nowrap">Date</TableHead>
                    <TableHead className="text-xs whitespace-nowrap">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-xs text-muted-foreground py-6"
                      >
                        No matching rows in preview
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((row) => {
                      const cat = categoryMap.get(row.category);
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="text-xs sticky left-0 z-10 bg-card whitespace-nowrap">
                            <span className="flex items-center gap-1.5">
                              {cat && <ColorDot color={cat.color} />}
                              {cat?.name ?? "Unknown"}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs max-w-30 truncate">
                            {row.description ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {row.tags.length > 0 ? row.tags.join(", ") : "—"}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{row.value}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{row.date}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{row.time}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {validRows.length > 10 && (
              <p className="text-xs text-muted-foreground text-center">
                Showing first 10 of {validRows.length} rows
              </p>
            )}
          </div>
        )}

        {validRows.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No valid rows to import. Check your column mapping and rules.
          </p>
        )}

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={handleImport} disabled={validRows.length === 0 || isImporting}>
            {isImporting ? "Importing..." : `Import ${validRows.length} rows`}
          </Button>
        </div>
      </m.div>
    </LazyMotion>
  );
}

function SummaryCard({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant?: "primary" | "warning";
}) {
  return (
    <div className="p-3 rounded-xl bg-card border border-border/50 text-center">
      <p
        className={`text-2xl font-bold ${
          variant === "primary"
            ? "text-primary"
            : variant === "warning"
              ? "text-yellow-500"
              : "text-foreground"
        }`}
      >
        {value.toLocaleString()}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

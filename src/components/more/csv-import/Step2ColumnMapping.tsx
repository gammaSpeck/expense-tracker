import { useMemo } from "react";
import { LazyMotion, domAnimation, m } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ColumnMapping } from "./useCsvImport";

interface Props {
  csvHeaders: string[];
  csvRows: Record<string, string>[];
  columnMapping: ColumnMapping;
  updateColumnMapping: (key: keyof ColumnMapping, value: unknown) => void;
  onBack: () => void;
  onNext: () => void;
}

const NOT_MAPPED = "__not_mapped__";

interface FieldRow {
  key: keyof ColumnMapping;
  label: string;
  required: boolean;
  hasRegex?: boolean;
  regexKey?: "dateRegex" | "timeRegex";
  isMulti?: boolean;
}

const FIELDS: FieldRow[] = [
  { key: "amount", label: "Amount", required: true },
  { key: "date", label: "Date", required: true, hasRegex: true, regexKey: "dateRegex" },
  { key: "category", label: "Category", required: true },
  { key: "time", label: "Time", required: false, hasRegex: true, regexKey: "timeRegex" },
  { key: "description", label: "Description", required: false },
  { key: "tagColumns", label: "Tags", required: false, isMulti: true },
  { key: "isAdhoc", label: "Is Adhoc", required: false },
];

function applyRegex(pattern: string, value: string): { matched: boolean; extracted: string } {
  if (!pattern) return { matched: true, extracted: value };
  try {
    const re = new RegExp(pattern);
    const m = value.match(re);
    if (m?.[1]) return { matched: true, extracted: m[1] };
    return { matched: false, extracted: "" };
  } catch {
    return { matched: false, extracted: "" };
  }
}

export default function Step2ColumnMapping({
  csvHeaders,
  csvRows,
  columnMapping,
  updateColumnMapping,
  onBack,
  onNext,
}: Props) {
  const preview = csvRows[0] ?? {};

  const errors = useMemo(() => {
    const errs: Partial<Record<keyof ColumnMapping, string>> = {};
    if (!columnMapping.amount) errs.amount = "This field is required";
    if (!columnMapping.date) errs.date = "This field is required";
    if (!columnMapping.category) errs.category = "This field is required";
    return errs;
  }, [columnMapping]);

  const hasErrors = Object.keys(errors).length > 0;

  function handleNext() {
    if (hasErrors) return;
    onNext();
  }

  function getSelectedCol(key: keyof ColumnMapping): string | null {
    const val = columnMapping[key];
    if (typeof val === "string") return val;
    return null;
  }

  function getPreviewValue(colName: string | null): string {
    if (!colName) return "";
    return preview[colName] ?? "";
  }

  return (
    <LazyMotion features={domAnimation}>
      <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Map your CSV columns to ExTrack fields. Preview shows the first row.
        </p>

        <div className="space-y-3">
          {FIELDS.map((field) => {
            if (field.isMulti) {
              // Multi-select for tags
              const selected = columnMapping.tagColumns;
              return (
                <div key={field.key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">{field.label}</label>
                  </div>
                  <Select
                    value="__placeholder__"
                    onValueChange={(v) => {
                      if (v !== "__placeholder__" && !selected.includes(v)) {
                        updateColumnMapping("tagColumns", [...selected, v]);
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Add tag column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {csvHeaders
                        .filter((h) => !selected.includes(h))
                        .map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {selected.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selected.map((s) => (
                        <Badge
                          key={s}
                          variant="secondary"
                          className="text-xs cursor-pointer"
                          onClick={() =>
                            updateColumnMapping(
                              "tagColumns",
                              selected.filter((x) => x !== s),
                            )
                          }
                        >
                          {s} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            const selectedCol = getSelectedCol(field.key);
            const previewVal = getPreviewValue(selectedCol);
            const error = errors[field.key];

            return (
              <div key={field.key} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">
                    {field.label}
                    {field.required && <span className="text-destructive ml-0.5">*</span>}
                  </label>
                  {previewVal && (
                    <span className="text-xs font-mono text-muted-foreground bg-muted rounded px-2 py-0.5 max-w-[150px] truncate">
                      {previewVal}
                    </span>
                  )}
                </div>

                <Select
                  value={selectedCol ?? NOT_MAPPED}
                  onValueChange={(v) => updateColumnMapping(field.key, v === NOT_MAPPED ? null : v)}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="— Not mapped —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NOT_MAPPED}>— Not mapped —</SelectItem>
                    {csvHeaders.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {field.hasRegex && field.regexKey && selectedCol && (
                  <RegexExtractor
                    pattern={columnMapping[field.regexKey]}
                    onChange={(v) => updateColumnMapping(field.regexKey!, v)}
                    sampleValue={previewVal}
                  />
                )}

                {error && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {error}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={handleNext} disabled={hasErrors}>
            Next
          </Button>
        </div>
      </m.div>
    </LazyMotion>
  );
}

function RegexExtractor({
  pattern,
  onChange,
  sampleValue,
}: {
  pattern: string;
  onChange: (v: string) => void;
  sampleValue: string;
}) {
  const result = useMemo(() => applyRegex(pattern, sampleValue), [pattern, sampleValue]);

  return (
    <div className="flex items-center gap-2">
      <Input
        value={pattern}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Regex extractor (optional)"
        className="h-8 text-xs font-mono flex-1"
      />
      {sampleValue && (
        <Badge variant={result.matched ? "secondary" : "destructive"} className="text-xs shrink-0">
          {result.matched ? result.extracted : "No match"}
        </Badge>
      )}
    </div>
  );
}

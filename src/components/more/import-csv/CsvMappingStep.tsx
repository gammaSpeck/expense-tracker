import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseDateTime } from "@/lib/csvImportPlan";
import type { CsvImportState } from "@/hooks/useCsvImport";
import type { CsvColumnMapping } from "@/types/csvImport";

const NOT_MAPPED = "__not_mapped__";

interface ColumnSelectProps {
  headers: string[];
  value: number | null;
  onChange: (index: number | null) => void;
  allowNone?: boolean;
}

export function ColumnSelect({ headers, value, onChange, allowNone }: ColumnSelectProps) {
  return (
    <Select
      value={value === null ? NOT_MAPPED : String(value)}
      onValueChange={(v) => onChange(v === NOT_MAPPED ? null : Number(v))}
    >
      <SelectTrigger>
        <SelectValue placeholder="Choose CSV column" />
      </SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value={NOT_MAPPED}>— Not mapped —</SelectItem>}
        {headers.map((header, index) => (
          <SelectItem key={header} value={String(index)}>
            {header}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function cellPreview(row: string[], index: number | null): string {
  if (index === null) return "";
  return (row[index] ?? "").trim();
}

interface FieldLabelProps {
  label: string;
  required?: boolean;
  sample?: string;
}

function FieldLabel({ label, required, sample }: FieldLabelProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </p>
      {sample && (
        <span className="text-xs font-mono text-muted-foreground bg-muted rounded px-2 py-0.5 max-w-[150px] truncate">
          {sample}
        </span>
      )}
    </div>
  );
}

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return (
    <p className="text-xs text-destructive flex items-center gap-1">
      <AlertCircle className="h-3 w-3" /> {message}
    </p>
  );
}

function DateParsePreview({ dateResult }: { dateResult: { date: string; time: string } | null }) {
  return (
    <span
      className={`inline-block text-xs rounded px-2 py-0.5 ${
        dateResult ? "bg-muted text-muted-foreground" : "bg-destructive/10 text-destructive"
      }`}
    >
      {dateResult ? `${dateResult.date} ${dateResult.time}` : "Could not parse"}
    </span>
  );
}

interface CsvMappingStepProps {
  csv: CsvImportState;
}

export function CsvMappingStep({ csv }: CsvMappingStepProps) {
  if (!csv.parsed) {
    return (
      <div className="p-4 rounded-xl bg-card border border-border/50 space-y-3">
        <p className="text-sm text-muted-foreground">Attach a CSV file first.</p>
        <Button type="button" variant="outline" size="sm" onClick={() => csv.reset()}>
          Back
        </Button>
      </div>
    );
  }

  const { headers, rows } = csv.parsed;
  const firstRow = rows[0];
  const mapping = csv.mapping;
  const dateResult = parseDateTime(firstRow, mapping);
  const errors = csv.mappingErrors;

  function updateMapping(patch: Partial<CsvColumnMapping>) {
    csv.setMapping({ ...mapping, ...patch });
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Map your CSV columns to ExTrack fields. Preview shows the first row.
      </p>
      <div className="p-4 rounded-xl bg-card border border-border/50 space-y-4">
        <div className="space-y-1">
          <FieldLabel label="Amount" required sample={cellPreview(firstRow, mapping.amount)} />
          <ColumnSelect headers={headers} value={mapping.amount} onChange={(amount) => updateMapping({ amount })} />
          <FieldError message={errors.amount} />
        </div>

        <div className="space-y-1">
          <FieldLabel label="Date & time" required />
          <div className="flex gap-2">
            <ColumnSelect
              headers={headers}
              value={mapping.dateTime}
              onChange={(dateTime) => updateMapping({ dateTime })}
            />
            <ColumnSelect
              headers={headers}
              value={mapping.dateTimeExtra}
              onChange={(dateTimeExtra) => updateMapping({ dateTimeExtra })}
              allowNone
            />
          </div>
          <Input
            value={mapping.dateFormat}
            onChange={(e) => updateMapping({ dateFormat: e.target.value })}
            placeholder="dd/MM/yyyy HH:mm:ss"
          />
          <DateParsePreview dateResult={dateResult} />
          <FieldError message={errors.dateTime} />
          <FieldError message={errors.dateFormat} />
        </div>

        <div className="space-y-1">
          <FieldLabel label="Category" required sample={cellPreview(firstRow, mapping.category)} />
          <ColumnSelect
            headers={headers}
            value={mapping.category}
            onChange={(category) => updateMapping({ category })}
          />
          <FieldError message={errors.category} />
        </div>

        <div className="space-y-1">
          <FieldLabel label="Description" sample={cellPreview(firstRow, mapping.description)} />
          <ColumnSelect
            headers={headers}
            value={mapping.description}
            onChange={(description) => updateMapping({ description })}
            allowNone
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Tags</p>
          <Select
            key={mapping.tags.length}
            onValueChange={(v) => updateMapping({ tags: [...mapping.tags, Number(v)] })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Add tag column..." />
            </SelectTrigger>
            <SelectContent>
              {headers
                .map((header, index) => ({ header, index }))
                .filter(({ index }) => !mapping.tags.includes(index))
                .map(({ header, index }) => (
                  <SelectItem key={header} value={String(index)}>
                    {header}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {mapping.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {mapping.tags.map((tagIndex, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Remove tag column ${headers[tagIndex]}`}
                  className="text-xs px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground"
                  onClick={() => updateMapping({ tags: mapping.tags.filter((_, idx) => idx !== i) })}
                >
                  {headers[tagIndex]} ×
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="ghost" onClick={() => csv.reset()}>
          Back
        </Button>
        <Button type="button" onClick={() => csv.goToStep("categories")}>
          Next
        </Button>
      </div>
    </div>
  );
}

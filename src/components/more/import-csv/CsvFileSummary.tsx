import { FileSpreadsheet } from "lucide-react";
import type { ParsedCsv } from "@/types/csvImport";
import type { SourcePreset } from "@/lib/csvImportPresets";

function humanizeFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface CsvFileSummaryProps {
  parsed: ParsedCsv;
  detectedPreset: SourcePreset | null;
  onChangeSource?: () => void;
}

/** Filename, row count, humanized file size, and column chips — shown wherever a parsed
 *  file is in scope (upload step on a miss, every later step after an auto-detected jump). */
export function CsvFileSummary({ parsed, detectedPreset, onChangeSource }: CsvFileSummaryProps) {
  return (
    <div className="p-4 rounded-xl bg-card border border-border/50 space-y-2">
      {detectedPreset && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <img src={detectedPreset.icon} alt="" className="h-4 w-4 rounded-sm shrink-0" />
            <p className="text-sm font-medium text-primary truncate">Detected: {detectedPreset.label}</p>
          </div>
          {onChangeSource && (
            <button type="button" className="text-xs text-muted-foreground hover:underline shrink-0" onClick={onChangeSource}>
              Change
            </button>
          )}
        </div>
      )}
      <div className="flex items-center gap-2">
        <FileSpreadsheet className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{parsed.fileName}</span>
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>{parsed.rows.length.toLocaleString()} rows</span>
        <span>{humanizeFileSize(parsed.fileSize)}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {parsed.headers.map((header) => (
          <span key={header} className="text-xs px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
            {header}
          </span>
        ))}
      </div>
    </div>
  );
}

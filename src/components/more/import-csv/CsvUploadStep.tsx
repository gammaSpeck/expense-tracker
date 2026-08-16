import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SOURCE_PRESETS, findPreset } from "@/lib/csvImportPresets";
import { CsvFileSummary } from "@/components/more/import-csv/CsvFileSummary";
import type { CsvImportState } from "@/hooks/useCsvImport";

function DropzoneCopy({ parsed }: { parsed: { fileName: string } | null }) {
  if (parsed) {
    return (
      <>
        <p className="text-sm font-medium">Drop a different CSV file to replace {parsed.fileName}</p>
        <p className="text-xs text-muted-foreground mt-1">This clears the current mapping and re-detects the source</p>
      </>
    );
  }
  return (
    <>
      <p className="text-sm font-medium">Drop a CSV file here or click to browse</p>
      <p className="text-xs text-muted-foreground mt-1">Supports .csv files up to 200,000 rows</p>
    </>
  );
}

function AutoDetectHint({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      <span>We auto-detect exports from:</span>
      {SOURCE_PRESETS.map((preset) => (
        <span
          key={preset.id}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground"
        >
          <img src={preset.icon} alt="" className="h-3.5 w-3.5 rounded-sm" />
          {preset.label}
        </span>
      ))}
    </div>
  );
}

interface CsvUploadStepProps {
  csv: CsvImportState;
}

export function CsvUploadStep({ csv }: CsvUploadStepProps) {
  const [isDragging, setIsDragging] = useState(false);
  const detectedPresetId = csv.detectedPresetId;

  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void csv.handleFileSelect(file);
    e.target.value = "";
  }

  return (
    <div className="space-y-4">
      <label
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors block ${
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) void csv.handleFileSelect(file);
        }}
      >
        <input
          type="file"
          accept=".csv"
          className="hidden"
          data-testid="csv-import-file-input"
          onChange={onFileSelect}
        />
        <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
        <DropzoneCopy parsed={csv.parsed} />
      </label>

      <AutoDetectHint visible={!csv.parsed} />

      {csv.parsed && <CsvFileSummary parsed={csv.parsed} detectedPreset={findPreset(detectedPresetId)} />}

      <div className="flex justify-between">
        <Button type="button" variant="ghost" disabled={!csv.parsed} onClick={() => csv.goToStep("mapping")}>
          Set up manually
        </Button>
        {detectedPresetId && (
          <Button
            type="button"
            onClick={() => {
              csv.applyPreset(detectedPresetId);
              csv.goToStep("mapping");
            }}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
}

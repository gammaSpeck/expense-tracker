import { useState } from "react";
import { Upload, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SOURCE_PRESETS, findPreset } from "@/lib/csvImportPresets";
import { CsvFileSummary } from "@/components/more/import-csv/CsvFileSummary";
import type { CsvImportState } from "@/hooks/useCsvImport";

function DropzoneCopy({ fileName }: { fileName: string | null }) {
  if (fileName) {
    return (
      <>
        <p className="text-sm font-medium">Drop a different CSV file to replace {fileName}</p>
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

interface CsvUploadStepProps {
  csv: CsvImportState;
}

export function CsvUploadStep({ csv }: CsvUploadStepProps) {
  const [isDragging, setIsDragging] = useState(false);

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
        <DropzoneCopy fileName={csv.parsed ? csv.parsed.fileName : null} />
      </label>

      <div className="p-4 rounded-xl bg-card border border-border/50 space-y-3">
        <p className="text-sm font-medium">Import from a specific app</p>
        <p className="text-xs text-muted-foreground">
          {csv.detectedPresetId
            ? "We detected a match below — confirm it, or choose a different source."
            : "Choose the app this file came from, or map columns manually below."}
        </p>
        <div className="flex flex-wrap gap-2">
          {SOURCE_PRESETS.map((preset) => {
            const isDetected = preset.id === csv.detectedPresetId;
            return (
              <Button
                key={preset.id}
                type="button"
                variant={isDetected ? "default" : "outline"}
                size="sm"
                disabled={!csv.parsed}
                onClick={() => {
                  csv.applyPreset(preset.id);
                  csv.goToStep("mapping");
                }}
              >
                <img src={preset.icon} alt="" className="h-4 w-4 rounded-sm" />
                {preset.label}
                {isDetected && <CheckCircle2 className="h-3.5 w-3.5" />}
              </Button>
            );
          })}
          <Button type="button" variant="ghost" size="sm" disabled={!csv.parsed} onClick={() => csv.goToStep("mapping")}>
            Set up manually
          </Button>
        </div>
      </div>

      {csv.parsed && <CsvFileSummary parsed={csv.parsed} detectedPreset={findPreset(csv.detectedPresetId)} />}
    </div>
  );
}

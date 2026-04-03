import { useRef, useState } from "react";
import { LazyMotion, domAnimation, m } from "framer-motion";
import { Upload, FileSpreadsheet } from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  onParsed: (headers: string[], rows: Record<string, string>[]) => void;
  onNext: () => void;
  hasParsedData: boolean;
  csvHeaders: string[];
  csvRows: Record<string, string>[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Step1Upload({ onParsed, onNext, hasParsedData, csvHeaders, csvRows }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);

  function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      toast.error("File must be a .csv format");
      return;
    }

    setFileName(file.name);
    setFileSize(file.size);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const fields = results.meta.fields;
        if (!fields?.length || !results.data.length) {
          toast.error("This file appears to be empty or has no column headers");
          setFileName(null);
          return;
        }
        if (results.data.length > 200_000) {
          toast.error("This file is too large. Please split it into files under 200,000 rows.");
          setFileName(null);
          return;
        }
        onParsed(fields, results.data);
      },
      error: () => {
        toast.error("Failed to parse CSV file");
        setFileName(null);
      },
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <LazyMotion features={domAnimation}>
      <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
          }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-medium">Drop a CSV file here or click to browse</p>
          <p className="text-xs text-muted-foreground mt-1">Supports .csv files up to 200,000 rows</p>
        </div>

        {hasParsedData && (
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-card border border-border/50 space-y-3"
          >
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{fileName}</span>
            </div>

            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>{csvRows.length.toLocaleString()} rows</span>
              <span>{formatFileSize(fileSize)}</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {csvHeaders.map((h) => (
                <Badge key={h} variant="secondary" className="text-xs">
                  {h}
                </Badge>
              ))}
            </div>
          </m.div>
        )}

        <div className="flex justify-end">
          <Button onClick={onNext} disabled={!hasParsedData}>
            Continue
          </Button>
        </div>
      </m.div>
    </LazyMotion>
  );
}

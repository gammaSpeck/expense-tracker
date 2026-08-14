import { Upload } from "lucide-react";
import type { RefObject } from "react";

interface ImportDropzoneProps {
  fileInputRef: RefObject<HTMLInputElement>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ImportDropzone({ fileInputRef, onFileSelect }: ImportDropzoneProps) {
  return (
    <div className="space-y-2">
      <label className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          accept=".extrack"
          className="hidden"
          data-testid="import-file-input"
          onChange={onFileSelect}
        />
        <Upload className="h-4 w-4" />
        <span className="text-sm">Select .extrack backup file</span>
      </label>
    </div>
  );
}

import { RefObject } from "react";
import type { ImportPreview } from "@/lib/importPreview";
import { ManualPassphrasePrompt } from "@/components/more/import/ManualPassphrasePrompt";
import { ImportDropzone } from "@/components/more/import/ImportDropzone";
import { ImportPreviewPanel } from "@/components/more/import/ImportPreviewPanel";

interface ImportFlowProps {
  pendingEncryptedText: string | null;
  manualPassphrase: string;
  setManualPassphrase: (value: string) => void;
  showManualPass: boolean;
  toggleShowManualPass: () => void;
  isDecrypting: boolean;
  onCancel: () => void;
  onManualDecrypt: () => void;
  fileInputRef: RefObject<HTMLInputElement>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  preview: ImportPreview | null;
  mode: "merge" | "override";
  onModeChange: (mode: "merge" | "override") => void;
  isImporting: boolean;
  onImport: () => void;
}

/** Renders whichever step of the import flow is active: passphrase prompt, dropzone, or preview. */
export function ImportFlow({
  pendingEncryptedText,
  manualPassphrase,
  setManualPassphrase,
  showManualPass,
  toggleShowManualPass,
  isDecrypting,
  onCancel,
  onManualDecrypt,
  fileInputRef,
  onFileSelect,
  preview,
  mode,
  onModeChange,
  isImporting,
  onImport,
}: ImportFlowProps) {
  if (pendingEncryptedText) {
    return (
      <ManualPassphrasePrompt
        passphrase={manualPassphrase}
        onPassphraseChange={setManualPassphrase}
        show={showManualPass}
        onToggleShow={toggleShowManualPass}
        isDecrypting={isDecrypting}
        onCancel={onCancel}
        onDecrypt={onManualDecrypt}
      />
    );
  }

  if (!preview) {
    return <ImportDropzone fileInputRef={fileInputRef} onFileSelect={onFileSelect} />;
  }

  return (
    <ImportPreviewPanel
      preview={preview}
      mode={mode}
      onModeChange={onModeChange}
      isImporting={isImporting}
      onCancel={onCancel}
      onImport={onImport}
    />
  );
}

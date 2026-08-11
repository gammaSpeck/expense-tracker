import { useRef, useState, type RefObject } from "react";
import { toast } from "sonner";
import { isEncryptedFile, decryptData, decryptWithStoredPassphrase } from "@/lib/backup";
import { buildImportPreview, validateImportFile, type ImportPreview } from "@/lib/importPreview";
import { captureError } from "@/lib/telemetry";

type FileCheck = { text: string } | { error: string };

/** Validates size + encrypted-file format before any decrypt attempt. */
async function readAndCheckFile(file: File): Promise<FileCheck> {
  const sizeError = validateImportFile(file);
  if (sizeError) return { error: sizeError };
  const text = await file.text();
  if (!isEncryptedFile(text)) {
    return { error: "Only encrypted .extrack backup files can be imported" };
  }
  return { text };
}

type PreviewResult = "ok" | "not-backup" | "invalid";

/** Shared decrypted-plaintext handling for both the auto and manual decrypt paths. */
function resolvePlaintext(
  plaintext: string,
  onPreviewReady: (preview: ImportPreview) => void,
): PreviewResult {
  if (!plaintext.trimStart().startsWith("{")) return "not-backup";
  const preview = buildImportPreview(plaintext);
  if (!preview) return "invalid";
  onPreviewReady(preview);
  return "ok";
}

function decryptErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : "";
  return msg.includes("Wrong passphrase")
    ? "Wrong passphrase — try again"
    : "Decryption failed. The file may be corrupted.";
}

function resetFileInput(fileInputRef: RefObject<HTMLInputElement | null>) {
  if (fileInputRef.current) fileInputRef.current.value = "";
}

function rejectNonBackupPlaintext() {
  toast.error("This file is an encrypted export, not a restorable backup");
}

interface FileSelectDeps {
  fileInputRef: RefObject<HTMLInputElement | null>;
  onPreviewReady: (preview: ImportPreview) => void;
  setPendingEncryptedText: (text: string | null) => void;
  setManualPassphrase: (value: string) => void;
}

async function performFileSelect(file: File, deps: FileSelectDeps) {
  deps.setPendingEncryptedText(null);
  deps.setManualPassphrase("");

  const checked = await readAndCheckFile(file);
  if ("error" in checked) {
    toast.error(checked.error);
    resetFileInput(deps.fileInputRef);
    return;
  }

  const plaintext = await decryptWithStoredPassphrase(checked.text);
  if (plaintext !== null) {
    const result = resolvePlaintext(plaintext, deps.onPreviewReady);
    if (result !== "ok") {
      if (result === "not-backup") rejectNonBackupPlaintext();
      else toast.error("Invalid backup file");
      resetFileInput(deps.fileInputRef);
    }
    return;
  }

  deps.setPendingEncryptedText(checked.text);
}

interface ManualDecryptDeps extends FileSelectDeps {
  pendingEncryptedText: string;
  manualPassphrase: string;
  setIsDecrypting: (value: boolean) => void;
}

async function performManualDecrypt(deps: ManualDecryptDeps) {
  deps.setIsDecrypting(true);
  try {
    const plaintext = await decryptData(deps.pendingEncryptedText, deps.manualPassphrase);
    const result = resolvePlaintext(plaintext, deps.onPreviewReady);
    if (result === "not-backup") {
      rejectNonBackupPlaintext();
      deps.setPendingEncryptedText(null);
      deps.setManualPassphrase("");
      resetFileInput(deps.fileInputRef);
    } else if (result === "invalid") {
      toast.error("Invalid backup file");
    } else {
      deps.setPendingEncryptedText(null);
      deps.setManualPassphrase("");
    }
  } catch (err) {
    captureError("import_failed", err, { stage: "decrypt" });
    toast.error(decryptErrorMessage(err));
  } finally {
    deps.setIsDecrypting(false);
  }
}

/** Owns the encrypted-import flow: file select, auto/manual decrypt, and the file input ref. */
export function useEncryptedFileImport(onPreviewReady: (preview: ImportPreview) => void) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingEncryptedText, setPendingEncryptedText] = useState<string | null>(null);
  const [manualPassphrase, setManualPassphrase] = useState("");
  const [showManualPass, setShowManualPass] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const deps: FileSelectDeps = {
    fileInputRef,
    onPreviewReady,
    setPendingEncryptedText,
    setManualPassphrase,
  };

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    await performFileSelect(selectedFile, deps);
  }

  async function handleManualDecrypt() {
    if (!pendingEncryptedText || !manualPassphrase) return;
    await performManualDecrypt({ ...deps, pendingEncryptedText, manualPassphrase, setIsDecrypting });
  }

  function resetEncryptedState() {
    setPendingEncryptedText(null);
    setManualPassphrase("");
    resetFileInput(fileInputRef);
  }

  return {
    fileInputRef,
    pendingEncryptedText,
    manualPassphrase,
    setManualPassphrase,
    showManualPass,
    toggleShowManualPass: () => setShowManualPass((v) => !v),
    isDecrypting,
    handleFileSelect,
    handleManualDecrypt,
    resetEncryptedState,
  };
}

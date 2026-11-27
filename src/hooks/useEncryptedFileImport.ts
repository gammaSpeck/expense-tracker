import { useRef, useState, type RefObject } from "react";
import { toast } from "sonner";
import { MAX_RESTORE_FILE_BYTES } from "@/config/limits";
import { userPreferences } from "@/db/userPreferences";
import { isEncryptedFile, decryptData, decryptWithStoredPassphrase } from "@/lib/backup";
import { buildImportPreview, type ImportPreview } from "@/lib/importPreview";
import { captureError } from "@/lib/telemetry";

const TOO_LARGE_MESSAGE =
  "This backup may be too large for this device's memory. Try restoring it on a computer.";

type FileCheck = { text: string } | { error: string } | { cancelled: true };

/** Confirms large files, then opens restore marker window 1 and checks the encrypted-file format. */
async function readAndCheckFile(file: File): Promise<FileCheck> {
  if (file.size > MAX_RESTORE_FILE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    const proceed = window.confirm(
      `This file is ${mb} MB. Restoring files this large may fail on phones with little memory. Try anyway?`,
    );
    if (!proceed) return { cancelled: true };
  }
  userPreferences.markRestoreStarted({ step: "read", bytes: file.size });
  let text: string;
  try {
    text = await file.text();
  } catch (err) {
    // Decryption has not started: on a large file this is most likely memory, else the file itself.
    captureError("import_failed", err, { stage: "read" });
    return {
      error:
        file.size > MAX_RESTORE_FILE_BYTES
          ? TOO_LARGE_MESSAGE
          : "Couldn't read this file. Try picking it again.",
    };
  }
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

function decryptErrorMessage(err: unknown, isLarge: boolean): string {
  const msg = err instanceof Error ? err.message : "";
  if (msg.includes("Wrong passphrase")) return "Wrong passphrase — try again";
  return isLarge ? TOO_LARGE_MESSAGE : "Decryption failed. The file may be corrupted.";
}

function resetFileInput(fileInputRef: RefObject<HTMLInputElement | null>) {
  if (fileInputRef.current) fileInputRef.current.value = "";
}

function rejectNonBackupPlaintext() {
  toast.error("This file is an encrypted CSV export from an older version and can't be restored.");
}

interface FileSelectDeps {
  fileInputRef: RefObject<HTMLInputElement | null>;
  onPreviewReady: (preview: ImportPreview) => void;
  setPendingEncryptedText: (text: string | null) => void;
  setManualPassphrase: (value: string) => void;
  isCurrent: () => boolean; // false once Cancel or a newer file selection superseded this run
}

async function performFileSelect(file: File, deps: FileSelectDeps) {
  deps.setPendingEncryptedText(null);
  deps.setManualPassphrase("");
  const isLarge = file.size > MAX_RESTORE_FILE_BYTES;

  try {
    const checked = await readAndCheckFile(file);
    if (!deps.isCurrent()) return;
    if ("cancelled" in checked) {
      resetFileInput(deps.fileInputRef);
      return;
    }
    if ("error" in checked) {
      toast.error(checked.error);
      resetFileInput(deps.fileInputRef);
      return;
    }

    const plaintext = await decryptWithStoredPassphrase(checked.text);
    if (!deps.isCurrent()) return;
    if (plaintext !== null) {
      const result = resolvePlaintext(plaintext, deps.onPreviewReady);
      if (result !== "ok") {
        if (result === "not-backup") rejectNonBackupPlaintext();
        else toast.error(isLarge ? TOO_LARGE_MESSAGE : "Invalid backup file");
        resetFileInput(deps.fileInputRef);
      }
      return;
    }

    deps.setPendingEncryptedText(checked.text);
  } catch (err) {
    if (!deps.isCurrent()) return;
    captureError("import_failed", err, { stage: "read" });
    toast.error(decryptErrorMessage(err, isLarge));
    resetFileInput(deps.fileInputRef);
  } finally {
    userPreferences.markRestoreEnded();
  }
}

interface ManualDecryptDeps extends FileSelectDeps {
  pendingEncryptedText: string;
  manualPassphrase: string;
  setIsDecrypting: (value: boolean) => void;
}

async function performManualDecrypt(deps: ManualDecryptDeps) {
  deps.setIsDecrypting(true);
  const bytes = deps.pendingEncryptedText.length;
  const isLarge = bytes > MAX_RESTORE_FILE_BYTES;
  try {
    userPreferences.markRestoreStarted({ step: "decrypt", bytes });
    const plaintext = await decryptData(deps.pendingEncryptedText, deps.manualPassphrase);
    if (!deps.isCurrent()) return;
    const result = resolvePlaintext(plaintext, deps.onPreviewReady);
    if (result === "not-backup") {
      rejectNonBackupPlaintext();
      deps.setPendingEncryptedText(null);
      deps.setManualPassphrase("");
      resetFileInput(deps.fileInputRef);
    } else if (result === "invalid") {
      toast.error(isLarge ? TOO_LARGE_MESSAGE : "Invalid backup file");
    } else {
      deps.setPendingEncryptedText(null);
      deps.setManualPassphrase("");
    }
  } catch (err) {
    if (!deps.isCurrent()) return;
    captureError("import_failed", err, { stage: "decrypt" });
    toast.error(decryptErrorMessage(err, isLarge));
  } finally {
    deps.setIsDecrypting(false);
    userPreferences.markRestoreEnded();
  }
}

/** Owns the encrypted-import flow: file select, auto/manual decrypt, and the file input ref. */
export function useEncryptedFileImport(onPreviewReady: (preview: ImportPreview) => void) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingEncryptedText, setPendingEncryptedText] = useState<string | null>(null);
  const [manualPassphrase, setManualPassphrase] = useState("");
  const [showManualPass, setShowManualPass] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const tokenRef = useRef(0);

  const depsFor = (token: number): FileSelectDeps => ({
    fileInputRef,
    onPreviewReady,
    setPendingEncryptedText,
    setManualPassphrase,
    isCurrent: () => tokenRef.current === token,
  });

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    await performFileSelect(selectedFile, depsFor(++tokenRef.current));
  }

  async function handleManualDecrypt() {
    if (!pendingEncryptedText || !manualPassphrase || isDecrypting) return;
    await performManualDecrypt({
      ...depsFor(tokenRef.current),
      pendingEncryptedText,
      manualPassphrase,
      setIsDecrypting,
    });
  }

  function resetEncryptedState() {
    tokenRef.current++; // abandons any in-flight select/decrypt
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

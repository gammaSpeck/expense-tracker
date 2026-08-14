import { useCallback, useState } from "react";
import { getStoredPassphrase } from "@/lib/backup";

/**
 * Checks for a stored encryption passphrase before running `onReady`; opens a
 * setup gate instead when none is stored. `onReady` is the caller-supplied
 * continuation for "passphrase already present" — callers differ on whether
 * that means opening a dialog or re-running an in-flight action.
 */
export function usePassphraseGate(onReady: () => void): {
  passphraseSetupOpen: boolean;
  closeGate: () => void;
  requestOrProceed: () => Promise<void>;
} {
  const [passphraseSetupOpen, setPassphraseSetupOpen] = useState(false);

  const requestOrProceed = useCallback(async () => {
    const passphrase = await getStoredPassphrase();
    if (!passphrase) {
      setPassphraseSetupOpen(true);
      return;
    }
    onReady();
  }, [onReady]);

  const closeGate = useCallback(() => setPassphraseSetupOpen(false), []);

  return { passphraseSetupOpen, closeGate, requestOrProceed };
}

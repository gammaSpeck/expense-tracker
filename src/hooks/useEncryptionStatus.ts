import { useEffect, useState } from "react";
import { getStoredPassphrase } from "@/lib/backup";

export function useEncryptionStatus() {
  const [hasPassphrase, setHasPassphrase] = useState<boolean | null>(null);
  const [storedPassphrase, setStoredPassphrase] = useState<string | null>(null);

  async function reload() {
    const p = await getStoredPassphrase();
    setHasPassphrase(p !== null);
    setStoredPassphrase(p);
  }

  useEffect(() => {
    reload();
  }, []);

  return { hasPassphrase, storedPassphrase, reload };
}

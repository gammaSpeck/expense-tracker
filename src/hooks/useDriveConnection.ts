import { useEffect, useState } from "react";
import { toast } from "sonner";
import { clearDriveCredentials, getDriveCredentials, type DriveCredentials } from "@/db/driveCredentials";
import { revokeToken } from "@/lib/driveAuth";

export function useDriveConnection() {
  const [creds, setCreds] = useState<DriveCredentials | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);

  useEffect(() => {
    getDriveCredentials().then(setCreds);
  }, []);

  async function handleUnlink() {
    setIsUnlinking(true);
    const snapshot = creds;
    await clearDriveCredentials();
    setCreds(null);
    try {
      if (snapshot) await revokeToken(snapshot.refreshToken);
    } finally {
      setIsUnlinking(false);
      toast.success("Google Drive disconnected.");
    }
  }

  return { creds, driveConnected: creds !== null, isUnlinking, handleUnlink };
}

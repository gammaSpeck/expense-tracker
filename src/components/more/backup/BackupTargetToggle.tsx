import { CloudUpload, HardDrive } from "lucide-react";

interface BackupTargetToggleProps {
  saveTo: "device" | "drive";
  onChange: (saveTo: "device" | "drive") => void;
  driveConnected: boolean;
  onConnectDrive: () => void;
}

export function BackupTargetToggle({
  saveTo,
  onChange,
  driveConnected,
  onConnectDrive,
}: BackupTargetToggleProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={() => onChange("device")}
        className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
          saveTo === "device" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
        }`}
      >
        <HardDrive className="h-4 w-4" />
        Device
      </button>
      {driveConnected ? (
        <button
          onClick={() => onChange("drive")}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all ${
            saveTo === "drive" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
          }`}
        >
          <CloudUpload className="h-4 w-4" />
          Google Drive
        </button>
      ) : (
        <button
          onClick={onConnectDrive}
          className="flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all bg-muted hover:bg-muted/80 text-sm"
        >
          <CloudUpload className="h-4 w-4" />
          Connect Drive
        </button>
      )}
    </div>
  );
}

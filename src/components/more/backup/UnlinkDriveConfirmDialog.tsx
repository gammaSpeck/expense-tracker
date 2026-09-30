import { Link2Off, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UnlinkDriveConfirmDialogProps {
  isUnlinking: boolean;
  onConfirm: () => void;
}

export function UnlinkDriveConfirmDialog({ isUnlinking, onConfirm }: UnlinkDriveConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructiveGhost"
          size="xs"
          disabled={isUnlinking}
        >
          {isUnlinking ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <Link2Off className="h-3 w-3 mr-1" />
          )}
          Unlink
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Disconnect Google Drive?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes your Google account from ExTrack. Existing backups in Drive will not be
            deleted — you can reconnect anytime.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={onConfirm}
          >
            Disconnect
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

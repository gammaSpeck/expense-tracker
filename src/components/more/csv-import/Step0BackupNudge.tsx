import { LazyMotion, domAnimation, m } from "framer-motion";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router";
import { differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { userPreferences } from "@/db/userPreferences";

interface Props {
  onSkip: () => void;
}

export default function Step0BackupNudge({ onSkip }: Props) {
  const navigate = useNavigate();
  const prefs = userPreferences.getBackupReminderPreferences();
  const lastBackupDate = prefs.lastBackupDate;

  let backupInfo: string;
  if (lastBackupDate) {
    const days = differenceInDays(new Date(), new Date(lastBackupDate));
    backupInfo = days === 0 ? "Last backed up today" : `Last backed up ${days} day${days === 1 ? "" : "s"} ago`;
  } else {
    backupInfo = "No backup found";
  }

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center text-center gap-6 py-8 px-4"
      >
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="h-7 w-7 text-primary" />
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Back up before importing</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Before importing new data, consider backing up your current expenses so you can restore them if needed.
          </p>
          <p className="text-xs text-muted-foreground">{backupInfo}</p>
        </div>

        <div className="flex flex-col gap-2 w-full max-w-xs">
          <Button onClick={() => navigate("/settings/data", { state: { openBackup: true } })}>
            Back up now
          </Button>
          <Button variant="ghost" onClick={onSkip} className="gap-1">
            Skip, continue <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </m.div>
    </LazyMotion>
  );
}

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type BackupReminderSchedule } from "@/db/userPreferences";

const SCHEDULE_OPTIONS: Array<{
  value: BackupReminderSchedule;
  label: string;
}> = [
  { value: "never", label: "Never" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

interface ReminderScheduleSelectProps {
  schedule: BackupReminderSchedule;
  onChange: (schedule: BackupReminderSchedule) => void;
}

export function ReminderScheduleSelect({ schedule, onChange }: ReminderScheduleSelectProps) {
  return (
    <Select value={schedule} onValueChange={(v) => onChange(v as BackupReminderSchedule)}>
      <SelectTrigger className="h-8 w-32 text-xs">
        <SelectValue placeholder="Select" />
      </SelectTrigger>
      <SelectContent>
        {SCHEDULE_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

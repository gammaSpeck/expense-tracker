import { useRef, useState } from "react";
import { Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getCurrentTime24 } from "@/lib/time";
import type { BulkDraftBlock, BulkDraftRow } from "@/db/bulkDraft";

interface RowTimeToggleProps {
  block: BulkDraftBlock;
  row: BulkDraftRow;
  today: string;
  onUpdate: (patch: Partial<BulkDraftRow>) => void;
}

function openTimePicker(input: HTMLInputElement | null): void {
  if (!input) return;
  input.focus();
  try {
    input.showPicker?.();
  } catch {
    // showPicker can throw outside a user gesture in some browsers — focus is enough of a
    // fallback that the user can still open it manually.
  }
}

function TimeToggleButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-label={open ? "Hide time" : "Set time"} onClick={onClick}>
      <Clock className="h-3.5 w-3.5" />
    </button>
  );
}

function RowTimeInput({
  open,
  value,
  onChange,
  registerRef,
}: {
  open: boolean;
  value: string;
  onChange: (v: string) => void;
  registerRef: (el: HTMLInputElement | null) => void;
}) {
  if (!open) return null;
  return (
    <Input
      ref={registerRef}
      type="time"
      aria-label="Time"
      className="h-7 w-24 text-xs"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function RowTimeToggle({ block, row, today, onUpdate }: RowTimeToggleProps) {
  const [timeOpen, setTimeOpen] = useState(row.time !== null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleToggle = () => {
    const opening = !timeOpen;
    setTimeOpen(opening);
    if (opening) requestAnimationFrame(() => openTimePicker(inputRef.current));
  };

  return (
    <>
      <TimeToggleButton open={timeOpen} onClick={handleToggle} />
      <RowTimeInput
        open={timeOpen}
        value={row.time ?? (block.date === today ? getCurrentTime24() : "12:00")}
        onChange={(v) => onUpdate({ time: v })}
        registerRef={(el) => {
          inputRef.current = el;
        }}
      />
    </>
  );
}

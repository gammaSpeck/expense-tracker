import { useNavigate } from "react-router";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CsvDoneStepProps {
  importedCount: number;
  onReset: () => void;
}

export function CsvDoneStep({ importedCount, onReset }: CsvDoneStepProps) {
  const navigate = useNavigate();

  return (
    <div className="p-6 rounded-xl bg-card border border-border/50 flex flex-col items-center gap-3 text-center">
      <CheckCircle2 className="h-10 w-10 text-primary" />
      <div className="space-y-1">
        <p className="text-lg font-semibold">Imported {importedCount.toLocaleString()} expenses</p>
        <p className="text-sm text-muted-foreground">Your data has been added successfully.</p>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => navigate("/transactions")}>
          View transactions
        </Button>
        <Button type="button" variant="ghost" onClick={onReset}>
          Import another file
        </Button>
      </div>
    </div>
  );
}

import { Controller, type Control } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ExpenseFormData } from "@/types/expense";

interface AdhocToggleFieldProps {
  control: Control<ExpenseFormData>;
}

export function AdhocToggleField({ control }: AdhocToggleFieldProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
      <div className="space-y-0.5">
        <Label htmlFor="isAdhoc" className="cursor-pointer">
          Adhoc Expense
        </Label>
        <p className="text-xs text-muted-foreground">
          Exclude from monthly analysis (vacations, big purchases)
        </p>
      </div>
      <Controller
        control={control}
        name="isAdhoc"
        render={({ field }) => <Switch id="isAdhoc" checked={field.value} onCheckedChange={field.onChange} />}
      />
    </div>
  );
}

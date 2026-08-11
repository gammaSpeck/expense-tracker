import type { UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExpenseFormData } from "@/types/expense";

interface AmountFieldProps {
  currencySymbol: string;
  register: UseFormRegister<ExpenseFormData>;
  errorMessage?: string;
}

export function AmountField({ currencySymbol, register, errorMessage }: AmountFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="value">Amount</Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
          {currencySymbol}
        </span>
        <Input
          id="value"
          type="number"
          step="0.01"
          min="0"
          max="10000000"
          className="pl-8 text-lg font-semibold"
          placeholder="0"
          autoFocus
          {...register("value", { valueAsNumber: true })}
        />
      </div>
      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
    </div>
  );
}

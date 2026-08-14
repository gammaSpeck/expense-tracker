import { Paperclip } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

function ExpenseValue({ value }: { value: number }) {
  const { currency, formatValue } = useCurrency();
  return (
    <>
      {currency.symbol}
      {formatValue(value)}
    </>
  );
}

interface ExpenseCardAmountProps {
  value: number;
  isAdhoc: boolean;
  hasAttachment: boolean;
}

export function ExpenseCardAmount({ value, isAdhoc, hasAttachment }: ExpenseCardAmountProps) {
  return (
    <div className="flex flex-col items-end gap-1">
      <span className="font-semibold text-sm">
        <ExpenseValue value={value} />
      </span>
      <div className="flex items-center gap-1">
        {isAdhoc && <span className="adhoc-badge text-[10px]">Adhoc</span>}
        {hasAttachment && <Paperclip className="h-3 w-3 text-muted-foreground" />}
      </div>
    </div>
  );
}

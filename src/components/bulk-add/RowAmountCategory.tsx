import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectTrigger } from "@/components/ui/select";
import {
  CategorySelectValue,
  CategoryOptionItems,
} from "@/components/categories/CategorySelectOptions";
import { commitOnEnter } from "@/lib/bulkAddDraft";
import type { RowFieldErrors } from "@/lib/bulkAddDraft";
import type { BulkDraftRow } from "@/db/bulkDraft";
import type { Category } from "@/types/expense";

export function RowFieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

interface RowAmountCategoryProps {
  row: BulkDraftRow;
  categories: Category[];
  currencySymbol: string;
  errors: RowFieldErrors | undefined;
  onUpdate: (patch: Partial<BulkDraftRow>) => void;
  onRemove: () => void;
  onCommit: () => void;
  registerAmountRef: (el: HTMLInputElement | null) => void;
}

export function RowAmountCategory({
  row,
  categories,
  currencySymbol,
  errors,
  onUpdate,
  onRemove,
  onCommit,
  registerAmountRef,
}: RowAmountCategoryProps) {
  const selectedCategory = categories.find((c) => c.id === row.category);

  return (
    <>
      <div className="flex gap-2 items-start">
        <div className="relative w-1/2">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            {currencySymbol}
          </span>
          <Input
            ref={registerAmountRef}
            aria-label="Amount"
            inputMode="decimal"
            placeholder="0"
            className="pl-7"
            value={row.value}
            onChange={(e) => onUpdate({ value: e.target.value })}
            onKeyDown={(e) => commitOnEnter(e, onCommit)}
          />
        </div>
        <Select value={row.category} onValueChange={(v) => onUpdate({ category: v })}>
          <SelectTrigger aria-label="Category" className="w-1/2">
            <CategorySelectValue category={selectedCategory} placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <CategoryOptionItems categories={categories} />
          </SelectContent>
        </Select>
        <button
          type="button"
          aria-label="Remove row"
          onClick={onRemove}
          className="p-2 text-muted-foreground hover:text-foreground"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <RowFieldError message={errors?.amount} />
      <RowFieldError message={errors?.category} />
    </>
  );
}

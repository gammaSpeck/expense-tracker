import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CategoryIcon } from "@/components/categories/CategoryIcon";
import { Category } from "@/types/expense";

interface DeleteActionOptionsProps {
  deleteData: { category: Category; expenseCount: number };
  categories: Category[];
  deleteAction: "move" | "cascade";
  setDeleteAction: (action: "move" | "cascade") => void;
  moveToCategory: string;
  setMoveToCategory: (id: string) => void;
}

export function DeleteActionOptions({
  deleteData,
  categories,
  deleteAction,
  setDeleteAction,
  moveToCategory,
  setMoveToCategory,
}: DeleteActionOptionsProps) {
  return (
    <div className="space-y-4 py-4">
      <RadioGroup value={deleteAction} onValueChange={(v) => setDeleteAction(v as "move" | "cascade")}>
        <div className="flex items-start space-x-3">
          <RadioGroupItem value="move" id="move" />
          <div className="space-y-1">
            <Label htmlFor="move">Move expenses to another category</Label>
            {deleteAction === "move" && (
              <Select value={moveToCategory} onValueChange={setMoveToCategory}>
                <SelectTrigger className="w-full mt-2">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter((c) => c.id !== deleteData.category.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <CategoryIcon icon={c.icon} color={c.color} size="sm" />
                          {c.name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        <div className="flex items-start space-x-3">
          <RadioGroupItem value="cascade" id="cascade" />
          <div className="space-y-1">
            <Label htmlFor="cascade" className="text-destructive">
              Delete all {deleteData.expenseCount} expenses
            </Label>
            <p className="text-xs text-muted-foreground">
              This will permanently delete all expenses in this category
            </p>
          </div>
        </div>
      </RadioGroup>
    </div>
  );
}

import { useEffect } from "react";
import { LazyMotion, domAnimation, m } from "framer-motion";
import { Lock, Plus, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import type { Category } from "@/types/expense";
import type { IgnoreRule } from "./useCsvImport";

interface Props {
  uniqueCategoryValues: string[];
  categoryRules: Record<string, string>;
  setCategoryRules: (rules: Record<string, string>) => void;
  defaultCategoryId: string;
  setDefaultCategoryId: (id: string) => void;
  categories: Category[];
  othersCategory: Category | undefined;
  ignoreRules: IgnoreRule[];
  addIgnoreRule: () => void;
  updateIgnoreRule: (index: number, rule: IgnoreRule) => void;
  removeIgnoreRule: (index: number) => void;
  csvHeaders: string[];
  mappedDateCol: string | null;
  mappedAmountCol: string | null;
  onBack: () => void;
  onNext: () => void;
}

function ColorDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
      style={{ backgroundColor: color }}
    />
  );
}

export default function Step3CategoryRules({
  uniqueCategoryValues,
  categoryRules,
  setCategoryRules,
  defaultCategoryId,
  setDefaultCategoryId,
  categories,
  othersCategory,
  ignoreRules,
  addIgnoreRule,
  updateIgnoreRule,
  removeIgnoreRule,
  csvHeaders,
  mappedDateCol,
  mappedAmountCol,
  onBack,
  onNext,
}: Props) {
  // Auto-set default category to Others if not set
  useEffect(() => {
    if (!defaultCategoryId && othersCategory) {
      setDefaultCategoryId(othersCategory.id);
    }
  }, [defaultCategoryId, othersCategory, setDefaultCategoryId]);

  const hasDefaultError = !defaultCategoryId;

  function handleRuleChange(csvValue: string, categoryId: string) {
    setCategoryRules({ ...categoryRules, [csvValue]: categoryId });
  }

  return (
    <LazyMotion features={domAnimation}>
      <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        {/* Category value rules */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Category Mapping</h3>
          <p className="text-xs text-muted-foreground">
            Map each unique CSV category value to an ExTrack category.
          </p>

          {uniqueCategoryValues.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No category values found in CSV.</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {uniqueCategoryValues.map((csvVal) => (
                <div key={csvVal} className="flex items-center gap-2">
                  <span className="text-sm truncate min-w-0 flex-1">{csvVal}</span>
                  <span className="text-muted-foreground text-xs">→</span>
                  <Select
                    value={categoryRules[csvVal] ?? ""}
                    onValueChange={(v) => handleRuleChange(csvVal, v)}
                  >
                    <SelectTrigger className="h-8 text-xs w-[180px] shrink-0">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="flex items-center gap-1.5">
                            <ColorDot color={c.color} />
                            {c.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Default category */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Default category <span className="text-muted-foreground text-xs">(for unmapped values)</span>
          </label>
          <Select value={defaultCategoryId} onValueChange={setDefaultCategoryId}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select default category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-1.5">
                    <ColorDot color={c.color} />
                    {c.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasDefaultError && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Default category is required
            </p>
          )}
        </div>

        {/* Advanced Rules */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold w-full group">
            <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
            Advanced Rules
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-3">
            <p className="text-xs text-muted-foreground">Configure which rows to skip during import</p>

            {/* System rules */}
            <div className="space-y-1.5">
              <SystemRule label={`Skip row if "${mappedDateCol || "Date"}" cell is empty`} />
              <SystemRule label={`Skip row if "${mappedAmountCol || "Amount"}" cell is empty or non-numeric`} />
            </div>

            {/* Custom rules */}
            <div className="space-y-2">
              {ignoreRules.map((rule, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Select
                    value={rule.column || ""}
                    onValueChange={(v) => updateIgnoreRule(i, { ...rule, column: v })}
                  >
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue placeholder="Column" />
                    </SelectTrigger>
                    <SelectContent>
                      {csvHeaders.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">==</span>
                  <Input
                    value={rule.value}
                    onChange={(e) => updateIgnoreRule(i, { ...rule, value: e.target.value })}
                    placeholder="Value"
                    className="h-8 text-xs flex-1"
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeIgnoreRule(i)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={addIgnoreRule}>
                <Plus className="h-3.5 w-3.5" /> Add rule
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack}>Back</Button>
          <Button onClick={onNext} disabled={hasDefaultError}>Next</Button>
        </div>
      </m.div>
    </LazyMotion>
  );
}

function SystemRule({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
      <Lock className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </div>
  );
}

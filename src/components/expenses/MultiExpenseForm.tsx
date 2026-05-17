import { useEffect, useState } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import imageCompression from "browser-image-compression";
import { toast } from "sonner";
import { CalendarIcon, Clock, ImagePlus, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryIcon } from "@/components/categories/CategoryIcon";

import { useCategories } from "@/hooks/useExpenseData";
import { useCurrency } from "@/contexts/CurrencyContext";
import { addExpenses, getTagSuggestions } from "@/db/expenseTrackerDb";
import { ExpenseFormData } from "@/types/expense";
import { getCurrentTime24 } from "@/lib/time";
import { cn } from "@/lib/utils";

interface MultiExpenseFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const expenseSchema = z.object({
  value: z
    .number({ error: "Amount is required" })
    .positive("Must be positive")
    .max(10000000, "Maximum 10,000,000"),
  category: z.string().min(1, "Category required"),
  description: z.string().optional(),
  tags: z.array(z.string()).max(4, "Maximum 4 tags"),
  date: z.string(),
  time: z.string(),
  isAdhoc: z.boolean(),
  attachment: z.string().optional(),
});

const formSchema = z.object({
  expenses: z.array(expenseSchema).min(1),
});

type MultiExpenseFormValues = z.infer<typeof formSchema>;

function makeBlankRow(): ExpenseFormData {
  const now = new Date();
  return {
    value: null,
    category: "",
    description: "",
    tags: [],
    date: format(now, "yyyy-MM-dd"),
    time: getCurrentTime24(),
    isAdhoc: false,
    attachment: undefined,
  };
}

async function compressAndEncodeImage(file: File): Promise<string> {
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  });
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(compressed);
  });
}

export function MultiExpenseForm({ onSuccess, onCancel }: MultiExpenseFormProps) {
  const categories = useCategories();
  const { currency } = useCurrency();
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);

  const { control, register, handleSubmit, watch, setValue, formState } =
    useForm<MultiExpenseFormValues>({
      resolver: zodResolver(formSchema),
      defaultValues: { expenses: [makeBlankRow()] },
    });
  const { fields, append, remove } = useFieldArray({ control, name: "expenses" });

  useEffect(() => {
    getTagSuggestions().then(setTagSuggestions);
  }, []);

  // Default each row's category to "Others" if blank, once categories load
  useEffect(() => {
    if (categories.length === 0) return;
    const others = categories.find((c) => c.name === "Others");
    if (!others) return;
    fields.forEach((_, i) => {
      if (!watch(`expenses.${i}.category`)) {
        setValue(`expenses.${i}.category`, others.id);
      }
    });
  }, [categories, fields, setValue, watch]);

  const handleAddRow = () => {
    const list = watch("expenses");
    const last = list[list.length - 1];
    append({
      value: null,
      description: "",
      attachment: undefined,
      category: last.category,
      tags: last.tags,
      date: last.date,
      time: last.time,
      isAdhoc: last.isAdhoc,
    });
  };

  const onSubmit = async ({ expenses }: MultiExpenseFormValues) => {
    try {
      await addExpenses(expenses as ExpenseFormData[] as never);
      toast.success(`${expenses.length} expense${expenses.length === 1 ? "" : "s"} added`);
      onSuccess?.();
    } catch {
      toast.error("Failed to save expenses — nothing was saved");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-3">
        {fields.map((field, index) => (
          <ExpenseCard
            key={field.id}
            index={index}
            total={fields.length}
            control={control}
            register={register}
            watch={watch}
            setValue={setValue}
            categories={categories}
            currencySymbol={currency.symbol}
            tagSuggestions={tagSuggestions}
            onRemove={() => remove(index)}
          />
        ))}
      </div>

      <Button type="button" variant="outline" onClick={handleAddRow} className="w-full">
        <Plus className="h-4 w-4 mr-1" />
        Add another expense
      </Button>

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={formState.isSubmitting}>
          {formState.isSubmitting
            ? "Saving..."
            : `Save ${fields.length} expense${fields.length === 1 ? "" : "s"}`}
        </Button>
      </div>
    </form>
  );
}

interface ExpenseCardProps {
  index: number;
  total: number;
  control: ReturnType<typeof useForm<MultiExpenseFormValues>>["control"];
  register: ReturnType<typeof useForm<MultiExpenseFormValues>>["register"];
  watch: ReturnType<typeof useForm<MultiExpenseFormValues>>["watch"];
  setValue: ReturnType<typeof useForm<MultiExpenseFormValues>>["setValue"];
  categories: ReturnType<typeof useCategories>;
  currencySymbol: string;
  tagSuggestions: string[];
  onRemove: () => void;
}

function ExpenseCard({
  index,
  total,
  control,
  register,
  watch,
  setValue,
  categories,
  currencySymbol,
  tagSuggestions,
  onRemove,
}: ExpenseCardProps) {
  const tags = watch(`expenses.${index}.tags`) || [];
  const attachment = watch(`expenses.${index}.attachment`);
  const [newTag, setNewTag] = useState("");

  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      setValue(
        `expenses.${index}.tags`,
        tags.filter((t) => t !== tag),
      );
    } else if (tags.length < 4) {
      setValue(`expenses.${index}.tags`, [...tags, tag]);
    }
  };

  const removeTag = (tag: string) => {
    setValue(
      `expenses.${index}.tags`,
      tags.filter((t) => t !== tag),
    );
  };

  const addNewTag = () => {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    if (tags.includes(trimmed) || tags.length >= 4) {
      setNewTag("");
      return;
    }
    setValue(`expenses.${index}.tags`, [...tags, trimmed]);
    setNewTag("");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressAndEncodeImage(file);
      setValue(`expenses.${index}.attachment`, base64);
    } catch {
      toast.error("Failed to compress image");
    }
  };

  const removeAttachment = () => setValue(`expenses.${index}.attachment`, undefined);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Expense {index + 1}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          disabled={total === 1}
          aria-label="Remove expense"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Amount + Category */}
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            {currencySymbol}
          </span>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="0"
            className="pl-7 font-semibold"
            {...register(`expenses.${index}.value`, { valueAsNumber: true })}
          />
        </div>
        <Controller
          control={control}
          name={`expenses.${index}.category`}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Category">
                  {field.value && categories.find((c) => c.id === field.value) && (
                    <div className="flex items-center gap-2 min-w-0">
                      <CategoryIcon
                        icon={categories.find((c) => c.id === field.value)!.icon}
                        color={categories.find((c) => c.id === field.value)!.color}
                        size="sm"
                      />
                      <span className="truncate">
                        {categories.find((c) => c.id === field.value)!.name}
                      </span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <CategoryIcon icon={category.icon} color={category.color} size="sm" />
                      <span>{category.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Description */}
      <Input
        placeholder="Description (optional)"
        className="text-sm"
        {...register(`expenses.${index}.description`)}
      />

      {/* Tags */}
      <div>
        {!!tags.length && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-primary/10 text-primary rounded-full text-xs"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:bg-primary/20 rounded-full p-0.5"
                  aria-label={`Remove ${tag}`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              disabled={tags.length >= 4}
            >
              <Plus className="h-3 w-3 mr-1" />
              {tags.length === 0 ? "Add tags" : "Add tag"}
              {tags.length >= 4 && " (max 4)"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <div className="max-h-48 overflow-y-auto p-2 space-y-1">
              {tagSuggestions.length === 0 && (
                <p className="text-xs text-muted-foreground px-1 py-2">No tags yet</p>
              )}
              {tagSuggestions.map((tag) => {
                const checked = tags.includes(tag);
                const disabled = !checked && tags.length >= 4;
                return (
                  <label
                    key={tag}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent cursor-pointer",
                      disabled && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={disabled}
                      onCheckedChange={() => toggleTag(tag)}
                    />
                    <span className="truncate">{tag}</span>
                  </label>
                );
              })}
            </div>
            <div className="border-t border-border p-2 flex gap-1">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addNewTag();
                  }
                }}
                placeholder="New tag"
                className="h-8 text-sm"
                disabled={tags.length >= 4}
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-8 w-8 shrink-0"
                onClick={addNewTag}
                disabled={tags.length >= 4 || !newTag.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Date + Time */}
      <div className="grid grid-cols-2 gap-2">
        <Controller
          control={control}
          name={`expenses.${index}.date`}
          render={({ field }) => (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal text-sm",
                    !field.value && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {field.value ? format(new Date(field.value), "PP") : "Date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value ? new Date(field.value) : undefined}
                  onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                  autoFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          )}
        />
        <div className="relative">
          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input type="time" className="pl-10 text-sm" {...register(`expenses.${index}.time`)} />
        </div>
      </div>

      {/* Adhoc + Attachment */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Controller
            control={control}
            name={`expenses.${index}.isAdhoc`}
            render={({ field }) => (
              <Switch
                id={`adhoc-${index}`}
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Label htmlFor={`adhoc-${index}`} className="text-sm cursor-pointer">
            Adhoc
          </Label>
        </div>
        {attachment ? (
          <button
            type="button"
            onClick={removeAttachment}
            className="relative h-12 w-12 rounded-lg overflow-hidden group shrink-0"
            title="Click to remove"
          >
            <img src={attachment} alt="Attachment" className="h-12 w-12 object-cover" />
            <div className="absolute inset-0 bg-destructive/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Trash2 className="h-4 w-4 text-destructive-foreground" />
            </div>
          </button>
        ) : (
          <Label className="flex items-center justify-center h-12 w-12 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors shrink-0">
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
          </Label>
        )}
      </div>
    </div>
  );
}

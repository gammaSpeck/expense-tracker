import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { getCurrentTime24 } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CategoryIcon } from "@/components/categories/CategoryIcon";
import { ExpenseFormData, Expense } from "@/types/expense";
import { useCategories } from "@/hooks/useExpenseData";
import {
  addExpense,
  updateExpense,
  getTagSuggestions,
  getDescriptionSuggestions,
} from "@/db/expenseTrackerDb";
import { CalendarIcon, Clock, Plus, X, ImagePlus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CategoryForm } from "@/components/categories/CategoryForm";
import imageCompression from "browser-image-compression";
import { toast } from "sonner";
import { useCurrency } from "@/contexts/CurrencyContext";

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

interface ExpenseFormProps {
  expense?: Expense;
  duplicate?: Expense;
  onSuccess?: () => void;
  onCancel?: () => void;
}

function initDefaults(expense?: Expense, duplicate?: Expense): ExpenseFormData {
  const now = new Date();
  const state = expense ??
    duplicate ?? {
      value: null,
      category: "",
      description: "",
      tags: [],
      date: format(now, "yyyy-MM-dd"),
      time: getCurrentTime24(),
      isAdhoc: false,
      attachment: undefined,
    };

  return {
    value: state.value,
    category: state.category,
    description: state.description || "",
    tags: state.tags,
    date: state.date,
    time: state.time,
    isAdhoc: state.isAdhoc,
    attachment: state.attachment,
  };
}

export function ExpenseForm({ expense, duplicate, onSuccess, onCancel }: ExpenseFormProps) {
  const categories = useCategories();
  const [tagInput, setTagInput] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [descriptionSuggestions, setDescriptionSuggestions] = useState<string[]>([]);
  const [showDescriptionDropdown, setShowDescriptionDropdown] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | undefined>(expense?.attachment);

  const defaultValues: ExpenseFormData = initDefaults(expense, duplicate);
  const { currency } = useCurrency();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues,
  });

  const tags = watch("tags");
  const description = watch("description");

  // Load tag suggestions
  useEffect(() => {
    getTagSuggestions().then(setTagSuggestions);
  }, []);

  // Load description suggestions when user types (after 2 characters)
  useEffect(() => {
    const descriptionValue = description || "";
    if (descriptionValue.length >= 2) {
      getDescriptionSuggestions(descriptionValue, 10).then((suggestions) => {
        setDescriptionSuggestions(suggestions);
        setShowDescriptionDropdown(suggestions.length > 0);
      });
    } else {
      setDescriptionSuggestions([]);
      setShowDescriptionDropdown(false);
    }
  }, [description]);

  // Filter suggestions based on description and input
  const filteredSuggestions = tagSuggestions.filter(
    (tag) =>
      !tags.includes(tag) &&
      (tag.toLowerCase().includes(tagInput.toLowerCase()) ||
        (description && tag.toLowerCase().includes(description.toLowerCase()))),
  );

  const addTag = (tag: string) => {
    if (tags.length < 4 && !tags.includes(tag)) setValue("tags", [...tags, tag]);

    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setValue(
      "tags",
      tags.filter((t) => t !== tag),
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };
      const compressed = await imageCompression(file, options);

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setValue("attachment", base64);
        setImagePreview(base64);
      };
      reader.readAsDataURL(compressed);
    } catch {
      toast.error("Failed to compress image");
    }
  };

  const removeImage = () => {
    setValue("attachment", undefined);
    setImagePreview(undefined);
  };

  const onSubmit = async (data: ExpenseFormData) => {
    try {
      if (expense) {
        await updateExpense(expense.id, data);
        toast.success("Expense updated");
      } else {
        await addExpense(data);
        toast.success("Expense added");
      }
      onSuccess?.();
    } catch {
      toast.error("Failed to save expense");
    }
  };

  const handleCategoryCreated = (id: string) => {
    setValue("category", id);
    setShowCategoryDialog(false);
  };

  // Set default category if not set
  useEffect(() => {
    if (!expense && categories.length > 0 && !watch("category")) {
      const othersCategory = categories.find((c) => c.name === "Others");
      if (othersCategory) {
        setValue("category", othersCategory.id);
      }
    }
  }, [categories, expense, setValue, watch]);

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Value Input */}
        <div className="space-y-2">
          <Label htmlFor="value">Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
              {currency.symbol}
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
          {errors.value && <p className="text-sm text-destructive">{errors.value.message}</p>}
        </div>

        {/* Category Select */}
        <div className="space-y-2">
          <Label>Category</Label>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category">
                    {field.value && categories.find((c) => c.id === field.value) && (
                      <div className="flex items-center gap-2">
                        <CategoryIcon
                          icon={categories.find((c) => c.id === field.value)!.icon}
                          color={categories.find((c) => c.id === field.value)!.color}
                          size="sm"
                        />
                        <span>{categories.find((c) => c.id === field.value)!.name}</span>
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
                  <div className="border-t border-border mt-1 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowCategoryDialog(true)}
                      className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-primary hover:bg-accent rounded"
                    >
                      <Plus className="h-4 w-4" />
                      Create New Category
                    </button>
                  </div>
                </SelectContent>
              </Select>
            )}
          />
          {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
        </div>

        {/* Description */}
        <div className="space-y-2 relative">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            placeholder="What was this expense for?"
            className="resize-none text-sm"
            rows={2}
            {...register("description")}
            onFocus={() => {
              if (description && description.length >= 2 && descriptionSuggestions.length > 0) {
                setShowDescriptionDropdown(true);
              }
            }}
            onBlur={() => {
              // Delay to allow click on suggestion
              setTimeout(() => setShowDescriptionDropdown(false), 200);
            }}
          />
          {showDescriptionDropdown && descriptionSuggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {descriptionSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    setValue("description", suggestion);
                    setShowDescriptionDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors first:rounded-t-lg last:rounded-b-lg"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label>Tags (max 4)</Label>
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
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {tags.length < 4 && (
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (tagInput.trim()) addTag(tagInput.trim());
                  }
                }}
                placeholder="Add tag"
                className="flex-1 text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  if (tagInput.trim()) {
                    addTag(tagInput.trim());
                  }
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
          {filteredSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {filteredSuggestions.slice(0, 5).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded-full transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Controller
              control={control}
              name="date"
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal text-sm",
                        !field.value && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(new Date(field.value), "PP") : "Pick a date"}
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
          </div>

          <div className="space-y-2">
            <Label>Time</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="time" className="pl-10 text-sm" {...register("time")} />
            </div>
          </div>
        </div>

        {/* Is Adhoc */}
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
            render={({ field }) => (
              <Switch id="isAdhoc" checked={field.value} onCheckedChange={field.onChange} />
            )}
          />
        </div>

        {/* Attachment */}
        <div className="space-y-2">
          <Label>Attachment (optional)</Label>
          {imagePreview ? (
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Attachment preview"
                className="h-24 w-24 object-cover rounded-xl"
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center h-24 w-24 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <ImagePlus className="h-6 w-6 text-muted-foreground" />
            </label>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : expense ? "Update" : "Save"}
          </Button>
        </div>
      </form>

      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
          </DialogHeader>
          <CategoryForm
            onSuccess={handleCategoryCreated}
            onCancel={() => setShowCategoryDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

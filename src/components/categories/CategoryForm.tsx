import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryFormData } from "@/types/expense";
import { IconPicker } from "@/components/categories/CategoryIcon";
import { ColorPicker } from "@/components/categories/ColorPicker";
import { buildCategoryDefaultValues } from "@/lib/categoryDefaults";
import { useCategoryFormSubmit } from "@/hooks/useCategoryFormSubmit";

const categorySchema = z.object({
  name: z.string().min(1, "Name required").max(30, "Max 30 characters"),
  icon: z.string().min(1, "Icon required"),
  color: z.string().min(1, "Color required"),
});

interface CategoryFormProps {
  category?: { id: string; name: string; icon: string; color: string };
  onSuccess?: (id: string) => void;
  onCancel?: () => void;
}

export function CategoryForm({ category, onSuccess, onCancel }: CategoryFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: buildCategoryDefaultValues(category),
  });

  const selectedIcon = watch("icon");
  const selectedColor = watch("color");
  const { onSubmit } = useCategoryFormSubmit(category, onSuccess);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="Category name" {...register("name")} autoFocus />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      {/* Icon Picker */}
      <div className="space-y-2">
        <Label>Icon</Label>
        <IconPicker value={selectedIcon} onChange={(icon) => setValue("icon", icon)} color={selectedColor} />
      </div>

      {/* Color Picker */}
      <div className="space-y-2">
        <Label>Color</Label>
        <ColorPicker value={selectedColor} onChange={(color) => setValue("color", color)} />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : category ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}

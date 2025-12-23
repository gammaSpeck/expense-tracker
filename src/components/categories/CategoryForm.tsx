import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryFormData } from "@/types/expense";
import { addCategory, updateCategory, getCategoryByName } from "@/lib/db";
import { IconPicker } from "@/components/categories/CategoryIcon";
import { ColorPicker } from "@/components/categories/ColorPicker";
import { CATEGORY_COLORS } from "@/lib/db";
import { toast } from "sonner";

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

export function CategoryForm({
  category,
  onSuccess,
  onCancel,
}: CategoryFormProps) {
  const defaultValues: CategoryFormData = category
    ? {
        name: category.name,
        icon: category.icon,
        color: category.color,
      }
    : {
        name: "",
        icon: "Tag",
        color:
          CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)],
      };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues,
  });

  const selectedIcon = watch("icon");
  const selectedColor = watch("color");

  const onSubmit = async (data: CategoryFormData) => {
    try {
      // Check for duplicate name (only for new categories or name changes)
      if (!category || category.name !== data.name) {
        const existing = await getCategoryByName(data.name);
        if (existing) {
          toast.error("A category with this name already exists");
          return;
        }
      }

      let id: string;
      if (category) {
        await updateCategory(category.id, data);
        id = category.id;
        toast.success("Category updated");
      } else {
        id = await addCategory(data);
        toast.success("Category created");
      }
      onSuccess?.(id);
    } catch (error) {
      toast.error("Failed to save category");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          placeholder="Category name"
          {...register("name")}
          autoFocus
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Icon Picker */}
      <div className="space-y-2">
        <Label>Icon</Label>
        <IconPicker
          value={selectedIcon}
          onChange={(icon) => setValue("icon", icon)}
          color={selectedColor}
        />
      </div>

      {/* Color Picker */}
      <div className="space-y-2">
        <Label>Color</Label>
        <ColorPicker
          value={selectedColor}
          onChange={(color) => setValue("color", color)}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
          >
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

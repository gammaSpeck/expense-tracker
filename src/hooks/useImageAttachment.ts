import { useState } from "react";
import type { UseFormSetValue } from "react-hook-form";
import imageCompression from "browser-image-compression";
import { toast } from "sonner";
import { ExpenseFormData } from "@/types/expense";

export function useImageAttachment(
  setValue: UseFormSetValue<ExpenseFormData>,
  initialAttachment?: string,
) {
  const [imagePreview, setImagePreview] = useState<string | undefined>(initialAttachment);

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

  return { imagePreview, handleImageUpload, removeImage };
}

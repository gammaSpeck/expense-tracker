import { useState } from "react";
import type { UseFormSetValue } from "react-hook-form";
import { toast } from "sonner";
import { ExpenseFormData } from "@/types/expense";
import {
  prepareReceiptPhoto,
  ReceiptPhotoError,
  type ReceiptPhotoRejection,
} from "@/lib/receiptPhoto";
import { capture } from "@/lib/telemetry";

const REJECTION_MESSAGES: Record<ReceiptPhotoRejection, string> = {
  "too-large":
    "This photo is too detailed to save under 0.5 MB. Crop closer to the receipt and try again.",
  unsupported:
    "This browser can't open HEIC photos. Take a screenshot of the photo or save it as a JPEG, then try again.",
  unreadable: "Couldn't open this photo. Try a JPEG or PNG, or take a screenshot of it.",
};

export function useImageAttachment(
  setValue: UseFormSetValue<ExpenseFormData>,
  initialAttachment?: string,
) {
  const [imagePreview, setImagePreview] = useState<string | undefined>(initialAttachment);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await prepareReceiptPhoto(file);
      setValue("attachment", dataUrl);
      setImagePreview(dataUrl);
    } catch (err) {
      input.value = "";
      const reason = err instanceof ReceiptPhotoError ? err.reason : "unreadable";
      capture("attachment_rejected", { reason });
      toast.error(REJECTION_MESSAGES[reason]);
    }
  };

  const removeImage = () => {
    setValue("attachment", undefined);
    setImagePreview(undefined);
  };

  return { imagePreview, handleImageUpload, removeImage };
}

import { ImagePlus, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";

interface AttachmentFieldProps {
  imagePreview: string | undefined;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}

export function AttachmentField({ imagePreview, onUpload, onRemove }: AttachmentFieldProps) {
  return (
    <div className="space-y-2">
      <Label>Attachment (optional)</Label>
      {imagePreview ? (
        <div className="relative inline-block">
          <img src={imagePreview} alt="Attachment preview" className="h-24 w-24 object-cover rounded-xl" />
          <button
            aria-label="Remove attachment"
            type="button"
            onClick={onRemove}
            className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <label className="flex items-center justify-center h-24 w-24 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onUpload}
            data-testid="attachment-input"
          />
          <ImagePlus className="h-6 w-6 text-muted-foreground" />
        </label>
      )}
    </div>
  );
}

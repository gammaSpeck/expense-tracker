import { ShieldCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface EncryptToggleRowProps {
  encrypt: boolean;
  onChange: (encrypt: boolean) => void;
}

export function EncryptToggleRow({ encrypt, onChange }: EncryptToggleRowProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
      <Checkbox id="export-encrypt" checked={encrypt} onCheckedChange={(v) => onChange(Boolean(v))} />
      <div className="flex items-center gap-1.5">
        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
        <Label htmlFor="export-encrypt" className="text-sm cursor-pointer">
          Encrypt this export
        </Label>
      </div>
      {encrypt && <span className="ml-auto text-xs text-muted-foreground">.extrack</span>}
    </div>
  );
}

import { Folder, Lock } from "lucide-react";

export function AboutFeatureHighlights() {
  return (
    <div className="text-left pt-4 border-t border-border space-y-3 overflow-hidden">
      <p className="text-xs text-muted-foreground">
        This expense manager was created to be open-source and free, because all other apps want
        to monetize themselves.
      </p>

      <div className="space-y-1.5">
        <div className="p-2 rounded-lg bg-muted/50">
          <span className="inline-flex items-center gap-1.5 font-medium text-xs mb-1">
            <Lock className="h-3 w-3" />
            Fully Local & Private
          </span>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            <li>• No backend server exists</li>
            <li>• All data stored on your device</li>
            <li>• Anonymous error &amp; diagnostic reports only — no personal data</li>
            <li>• Your data never leaves your phone</li>
          </ul>
        </div>

        <div className="p-2 rounded-lg bg-muted/50">
          <span className="inline-flex items-center gap-1.5 font-medium text-xs mb-1">
            <Folder className="h-3 w-3" />
            Open Source
          </span>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            <li>• MIT Licensed</li>
            <li>• Contributions welcome</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

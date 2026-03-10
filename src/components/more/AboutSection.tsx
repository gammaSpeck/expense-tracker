import { Github, Lock, Folder, PiggyBank } from "lucide-react";

export function AboutSection() {
  return (
    <div className="text-center space-y-5">
      <div className="text-2xl">
        <PiggyBank className="h-8 w-8 mx-auto mb-1" />
      </div>
      <h3 className="text-base font-semibold">Expense Tracker</h3>

      <div className="text-xs text-muted-foreground space-y-0.5">
        <p>Version v{__APP_VERSION__}</p>
        <p>Last Updated: {__BUILD_TIME__}</p>
      </div>

      <div className="text-xs">
        <p className="text-muted-foreground">Created by</p>
        <p className="font-medium">Madhusoodhanan KM</p>
      </div>

      <a
        href="https://github.com/gammaSpeck/expense-tracker"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline break-all"
      >
        <Github className="h-3 w-3" />
        Open on GitHub
      </a>

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
              <li>• No tracking, no analytics</li>
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
    </div>
  );
}

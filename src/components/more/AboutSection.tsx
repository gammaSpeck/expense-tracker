import { Github, Lock, Folder } from "lucide-react";

export function AboutSection() {
  return (
    <div className="text-center space-y-4">
      <div className="text-4xl">💰</div>
      <h3 className="text-lg font-bold">Expense Tracker</h3>

      <div className="text-sm text-muted-foreground space-y-1">
        <p>Version v0.0.2</p>
        <p>Last Updated: December 2025</p>
      </div>

      <div className="text-sm">
        <p className="text-muted-foreground">Created by</p>
        <p className="font-medium">Madhusoodhanan KM</p>
      </div>

      <a
        href="https://github.com/gammaSpeck"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
      >
        <Github className="h-4 w-4" />
        github.com/gammaSpeck
      </a>

      <div className="text-left pt-4 border-t border-border space-y-4">
        <p className="text-sm text-muted-foreground">
          This expense manager was created to be open-source and free, because
          all other apps want to monetize themselves.
        </p>

        <div className="space-y-2">
          <div className="p-3 rounded-lg bg-muted/50">
            <span className="inline-flex items-center gap-2 font-medium text-sm mb-2">
              <Lock className="h-4 w-4" />
              Fully Local & Private
            </span>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• No backend server exists</li>
              <li>• All data stored on your device</li>
              <li>• No tracking, no analytics</li>
              <li>• Your data never leaves your phone</li>
            </ul>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <span className="inline-flex items-center gap-2 font-medium text-sm mb-2">
              <Folder className="h-4 w-4" />
              Open Source
            </span>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• MIT Licensed</li>
              <li>• Contributions welcome</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

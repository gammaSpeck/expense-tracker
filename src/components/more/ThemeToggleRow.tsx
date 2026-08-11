import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { Theme } from "@/types/expense";

const THEMES = [
  { value: "light" as const, icon: Sun },
  { value: "dark" as const, icon: Moon },
  { value: "system" as const, icon: Monitor },
];

interface ThemeToggleRowProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export function ThemeToggleRow({ theme, setTheme }: ThemeToggleRowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-card border border-border/50">
      <span className="text-sm font-medium">Theme</span>
      <div className="flex gap-1">
        {THEMES.map(({ value, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={cn(
              "p-2 rounded-lg transition-all",
              theme === value
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80 text-muted-foreground",
            )}
            aria-label={value}
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
    </div>
  );
}

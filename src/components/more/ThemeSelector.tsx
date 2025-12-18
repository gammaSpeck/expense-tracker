import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  const themes = [
    { value: "light" as const, icon: Sun, label: "Light" },
    { value: "dark" as const, icon: Moon, label: "Dark" },
    { value: "system" as const, icon: Monitor, label: "System" },
  ];

  return (
    <div className="flex gap-2">
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
            theme === value
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          }`}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}

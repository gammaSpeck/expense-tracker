import { LazyMotion, domAnimation, m } from "framer-motion";
import { Sun, Moon, Monitor, ChevronRight, Settings } from "lucide-react";
import { useNavigate } from "react-router";
import { useTheme } from "@/contexts/ThemeContext";
import CurrencyDropdown from "@/components/more/CurrencyDropdown";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const themes = [
    { value: "light" as const, icon: Sun },
    { value: "dark" as const, icon: Moon },
    { value: "system" as const, icon: Monitor },
  ];

  return (
    <LazyMotion features={domAnimation}>
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4 overflow-x-hidden">
        <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </h1>
        </m.div>

        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-1"
        >
          {/* Theme Row */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-card border border-border/50">
            <span className="text-sm font-medium">Theme</span>
            <div className="flex gap-1">
              {themes.map(({ value, icon: Icon }) => (
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

          {/* Currency Row */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-card border border-border/50">
            <span className="text-sm font-medium">Currency</span>
            <CurrencyDropdown compact />
          </div>

          {/* Data Management Row */}
          <button
            onClick={() => navigate("/settings/data")}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-card border border-border/50 hover:bg-accent/50 transition-colors"
          >
            <span className="text-sm font-medium">Data Management</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* About App Row */}
          <button
            onClick={() => navigate("/settings/about")}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-card border border-border/50 hover:bg-accent/50 transition-colors"
          >
            <span className="text-sm font-medium">About App</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </m.div>
      </div>
    </LazyMotion>
  );
}

import { ChevronRight, Settings } from "lucide-react";
import { useNavigate } from "react-router";
import { useTheme } from "@/contexts/ThemeContext";
import CurrencyDropdown from "@/components/more/CurrencyDropdown";
import { ThemeToggleRow } from "@/components/more/ThemeToggleRow";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-4 overflow-x-hidden">
      <div className="animate-slide-in-up">
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Settings
        </h1>
      </div>

      <div
        className="space-y-1 animate-slide-in-up"
        style={{ animationDelay: "100ms", animationFillMode: "backwards" }}
      >
        <ThemeToggleRow theme={theme} setTheme={setTheme} />

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
      </div>
    </div>
  );
}

import { motion } from "framer-motion";
import { Palette, Database, Info, AlertTriangle } from "lucide-react";
import { ThemeSelector } from "@/components/more/ThemeSelector";

import { ExportData } from "@/components/more/ExportData";
import { ImportData } from "@/components/more/ImportData";
import { AboutSection } from "@/components/more/AboutSection";
import { FactoryReset } from "@/components/more/FactoryReset";
import CurrencyDropdown from "@/components/more/CurrencyDropdown";

export default function MorePage() {
  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-4 overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-lg font-semibold">More</h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        {/* Appearance */}
        <div className="p-3 rounded-xl bg-card border border-border/50 space-y-3">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </h2>
          <ThemeSelector />
        </div>

        {/* Currency Selector */}
        <div className="p-3 rounded-xl bg-card border border-border/50 space-y-3">
          <h2 className="text-sm font-medium flex items-center gap-2">
            Currency
          </h2>
          <CurrencyDropdown />
        </div>

        {/* Data Management */}
        <div className="p-3 rounded-xl bg-card border border-border/50 space-y-3">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data Management
          </h2>
          <ExportData />
          <div className="border-t border-border pt-3">
            <ImportData />
          </div>
        </div>

        {/* About */}
        <div className="p-3 rounded-xl bg-card border border-border/50 space-y-3">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <Info className="h-4 w-4" />
            About
          </h2>
          <AboutSection />
        </div>

        {/* Danger Zone */}
        <div className="p-3 rounded-xl bg-card border border-destructive/30 space-y-3">
          <h2 className="text-sm font-medium flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </h2>
          <FactoryReset />
        </div>
      </motion.div>
    </div>
  );
}

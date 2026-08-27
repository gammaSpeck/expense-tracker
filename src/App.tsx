import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router";
import { toast } from "sonner";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ReloadPrompt } from "@/components/ReloadPrompt";
import { BackupReminderPrompt } from "@/components/BackupReminderPrompt";
import { DataLossDialog } from "@/components/DataLossDialog";
import { lazy } from "react";
import { initializeDatabase } from "@/db/expenseTrackerDb";
import { userPreferences } from "@/db/userPreferences";
import { useAppStartup } from "@/hooks/useAppStartup";
import { markAutoBackup } from "@/lib/backup";
import { restoreSnapshot } from "@/lib/autoBackup";

import HomePage from "./pages/HomePage";

import TransactionsPage from "./pages/TransactionsPage";
import SettingsPage from "./pages/SettingsPage";
import DataManagementPage from "./pages/DataManagementPage";
import AboutPage from "./pages/AboutPage";
import NotFound from "./pages/NotFound";
import GoogleCallbackPage from "./pages/GoogleCallbackPage";

import { CurrencyProvider } from "@/contexts/CurrencyContext";

const AddExpensePage = lazy(() => import("@/pages/AddExpensePage"));
const CategoriesPage = lazy(() => import("@/pages/CategoriesPage"));
const AnalysisPage = lazy(() => import("@/pages/AnalysisPage"));
const EditExpensePage = lazy(() => import("@/pages/EditExpensePage"));
const CsvImportPage = lazy(() => import("@/pages/CsvImportPage"));
const BulkAddPage = lazy(() => import("@/pages/BulkAddPage"));

function AppContent() {
  const navigate = useNavigate();
  const { lossCount, setLossCount, lossDialogOpen, setLossDialogOpen, restoreOffer, setRestoreOffer } =
    useAppStartup();

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/add" element={<AddExpensePage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/expense/:id" element={<EditExpensePage />} />
        <Route path="/expense/:id/edit" element={<EditExpensePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/data" element={<DataManagementPage />} />
        <Route path="/settings/data/import-csv" element={<CsvImportPage />} />
        <Route path="/add/bulk" element={<BulkAddPage />} />
        <Route path="/settings/about" element={<AboutPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {(lossCount !== null || restoreOffer !== null) && (
        <DataLossDialog
          open={lossDialogOpen}
          lastSeenExpenseCount={lossCount}
          snapshot={restoreOffer}
          onStartFresh={() => {
            const freshNow = new Date().toISOString();
            userPreferences.setInstallMarker({
              installedAt: freshNow,
              lastSeenAt: freshNow,
              lastSeenExpenseCount: 0,
            });
            if (restoreOffer) markAutoBackup({ restoreOfferDeclinedFor: restoreOffer.name });
            setLossDialogOpen(false);
            setLossCount(null);
            setRestoreOffer(null);
            void initializeDatabase();
          }}
          onRestore={() => {
            setLossDialogOpen(false);
            navigate("/settings/data");
          }}
          onRestoreSnapshot={
            restoreOffer
              ? () => {
                  const offer = restoreOffer;
                  void restoreSnapshot(offer.name)
                    .then(({ expenseCount }) => {
                      setLossDialogOpen(false);
                      setLossCount(null);
                      setRestoreOffer(null);
                      toast.success(
                        `Restored ${expenseCount} expenses. Currency and theme settings are not part of a safety copy.`,
                      );
                      navigate("/transactions");
                    })
                    .catch((err: unknown) => {
                      toast.error(err instanceof Error ? err.message : "Restore failed");
                    });
                }
              : undefined
          }
        />
      )}
      <BackupReminderPrompt />
    </AppLayout>
  );
}

function RootRoutes() {
  return (
    <Routes>
      <Route path="/oauth/callback" element={<GoogleCallbackPage />} />
      <Route path="/*" element={<AppContent />} />
    </Routes>
  );
}

const App = () => (
  <CurrencyProvider>
    <ThemeProvider>
      <TooltipProvider>
        <Sonner position="top-right" duration={3000} />
        <BrowserRouter>
          <RootRoutes />
        </BrowserRouter>
        <ReloadPrompt />
      </TooltipProvider>
    </ThemeProvider>
  </CurrencyProvider>
);

export default App;

import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ReloadPrompt } from "@/components/ReloadPrompt";
import { BackupReminderPrompt } from "@/components/BackupReminderPrompt";
import { useEffect } from "react";
import { initializeDatabase } from "@/db/expenseTrackerDb";

import HomePage from "./pages/HomePage";
import AddExpensePage from "./pages/AddExpensePage";
import CategoriesPage from "./pages/CategoriesPage";
import AnalysisPage from "./pages/AnalysisPage";
import TransactionsPage from "./pages/TransactionsPage";
import EditExpensePage from "./pages/EditExpensePage";
import SettingsPage from "./pages/SettingsPage";
import DataManagementPage from "./pages/DataManagementPage";
import AboutPage from "./pages/AboutPage";
import NotFound from "./pages/NotFound";
import GoogleCallbackPage from "./pages/GoogleCallbackPage";

import { CurrencyProvider } from "@/contexts/CurrencyContext";

const queryClient = new QueryClient();

function AppContent() {
  useEffect(() => {
    initializeDatabase();
  }, []);

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
        <Route path="/settings/about" element={<AboutPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
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
  <QueryClientProvider client={queryClient}>
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
  </QueryClientProvider>
);

export default App;

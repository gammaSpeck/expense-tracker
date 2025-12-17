import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { useEffect } from "react";
import { initializeDatabase } from "@/lib/db";

import HomePage from "./pages/HomePage";
import AddExpensePage from "./pages/AddExpensePage";
import CategoriesPage from "./pages/CategoriesPage";
import AnalysisPage from "./pages/AnalysisPage";
import TransactionsPage from "./pages/TransactionsPage";
import EditExpensePage from "./pages/EditExpensePage";
import NotFound from "./pages/NotFound";

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
        <Route path="/expense/:id/edit" element={<EditExpensePage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

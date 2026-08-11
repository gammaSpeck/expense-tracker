import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpenseList } from "@/components/expenses/ExpenseList";
import { TransactionSearchBar } from "@/components/expenses/TransactionSearchBar";
import { DeleteExpenseDialog } from "@/components/expenses/DeleteExpenseDialog";
import { useCategories, useFilteredExpenses } from "@/hooks/useExpenseData";
import { useExpenseActions } from "@/hooks/useExpenseActions";

export default function TransactionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialSearch = location.state?.search || "";

  const [search, setSearch] = useState(initialSearch);

  const categories = useCategories();
  const expenses = useFilteredExpenses({ search });

  const {
    expenseToDelete,
    setExpenseToDelete,
    handleExpenseClick,
    handleDuplicate,
    handleEdit,
    handleDelete,
  } = useExpenseActions();

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 animate-slide-in-up">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-9 w-9">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">All Transactions</h1>
      </div>

      <TransactionSearchBar search={search} onSearchChange={setSearch} resultCount={expenses.length} />

      {/* Transaction List */}
      <div className="animate-fade-in" style={{ animationDelay: "100ms", animationFillMode: "backwards" }}>
        <ExpenseList
          expenses={expenses}
          categories={categories}
          onExpenseClick={handleExpenseClick}
          onDuplicate={handleDuplicate}
          onEdit={handleEdit}
          onDelete={setExpenseToDelete}
          grouped
          emptyMessage={search ? "No matching transactions" : "No transactions yet"}
        />
      </div>

      <DeleteExpenseDialog
        mode="controlled"
        open={!!expenseToDelete}
        onOpenChange={() => setExpenseToDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

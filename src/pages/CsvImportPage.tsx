import { ArrowLeftRight } from "lucide-react";
import { useNavigate } from "react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { CsvImportFlow } from "@/components/more/import-csv/CsvImportFlow";
import { useCsvImport } from "@/hooks/useCsvImport";

export default function CsvImportPage() {
  const navigate = useNavigate();
  const csv = useCsvImport();
  const isWideStep = csv.step === "mapping" || csv.step === "preview";

  return (
    <div className={`px-4 py-6 mx-auto space-y-4 ${isWideStep ? "max-w-3xl" : "max-w-2xl"}`}>
      <PageHeader
        icon={<ArrowLeftRight className="h-5 w-5" />}
        title="Migrate from another app"
        onBack={() => navigate("/settings/data")}
      />
      <CsvImportFlow csv={csv} />
    </div>
  );
}

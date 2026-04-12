import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";

export function CsvImportWizard() {
  const navigate = useNavigate();

  return (
    <>
      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={() => navigate("/import-external-csv")}
      >
        <FileSpreadsheet className="h-4 w-4" />
        Import from CSV
      </Button>
    </>
  );
}

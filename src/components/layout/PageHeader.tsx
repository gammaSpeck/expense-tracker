import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  icon: React.ReactNode;
  title: string;
  onBack: () => void;
}

export function PageHeader({ icon, title, onBack }: PageHeaderProps) {
  return (
    <div className="flex items-center gap-2 animate-slide-in-up">
      <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={onBack}>
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <h1 className="text-lg font-semibold flex items-center gap-2">
        {icon}
        {title}
      </h1>
    </div>
  );
}

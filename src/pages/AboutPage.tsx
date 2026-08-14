import { Info } from "lucide-react";
import { useNavigate } from "react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { AboutSection } from "@/components/more/AboutSection";

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-4 overflow-x-hidden">
      <PageHeader icon={<Info className="h-5 w-5" />} title="About App" onBack={() => navigate("/settings")} />

      <div
        className="px-2 py-4 animate-slide-in-up"
        style={{ animationDelay: "100ms", animationFillMode: "backwards" }}
      >
        <AboutSection />
      </div>
    </div>
  );
}

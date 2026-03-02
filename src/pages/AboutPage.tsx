import { LazyMotion, domAnimation, m } from "framer-motion";
import { ChevronLeft, Info } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { AboutSection } from "@/components/more/AboutSection";

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <LazyMotion features={domAnimation}>
      <div className="px-4 py-6 max-w-2xl mx-auto space-y-4 overflow-x-hidden">
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2"
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 -ml-2"
            onClick={() => navigate("/settings")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Info className="h-5 w-5" />
            About App
          </h1>
        </m.div>

        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="px-2 py-4"
        >
          <AboutSection />
        </m.div>
      </div>
    </LazyMotion>
  );
}

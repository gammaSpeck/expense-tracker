import { useEffect } from "react";
import { History } from "lucide-react";
import { useNavigate } from "react-router";
import { PageHeader } from "@/components/layout/PageHeader";
import { WhatsNewList } from "@/components/whatsNew/WhatsNewList";
import { visibleGroups, markWhatsNewSeen } from "@/hooks/useWhatsNew";
import { GITHUB_REPO_LINK } from "@/config";

export default function ChangelogPage() {
  const navigate = useNavigate();
  const groups = visibleGroups();

  useEffect(() => {
    markWhatsNewSeen();
  }, []);

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto space-y-4 overflow-x-hidden">
      <PageHeader
        icon={<History className="h-5 w-5" />}
        title="Changelog"
        onBack={() => navigate("/settings")}
      />

      <div
        className="px-2 py-4 space-y-4 animate-slide-in-up"
        style={{ animationDelay: "100ms", animationFillMode: "backwards" }}
      >
        <p className="text-xs text-muted-foreground">Every update since day one.</p>

        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No updates to show yet.</p>
        ) : (
          <WhatsNewList groups={groups} />
        )}

        <a
          href={`${GITHUB_REPO_LINK}/blob/main/CHANGELOG.md`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline"
        >
          Full technical changelog on GitHub
        </a>
      </div>
    </div>
  );
}

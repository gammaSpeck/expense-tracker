import { config, GITHUB_REPO_LINK } from "@/config";
import { Github, PiggyBank } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Link } from "react-router";
import { AboutFeatureHighlights } from "@/components/more/AboutFeatureHighlights";

const versionLabel =
  config.env === "production" ? `v${config.appVersion}` : `v${config.appVersion}.${config.env}`;

export function AboutSection() {
  return (
    <div className="text-center space-y-5">
      <div className="text-2xl">
        <PiggyBank className="h-8 w-8 mx-auto mb-1" />
      </div>
      <h3 className="text-base font-semibold">Expense Tracker</h3>

      <div className="text-xs text-muted-foreground space-y-0.5">
        <p>Version {versionLabel}</p>
        <p>Last Updated: {format(parseISO(config.buildTime), "dd MMMM yyyy")}</p>
        <Link to="/settings/changelog" className="text-xs text-primary hover:underline">
          View changelog
        </Link>
      </div>

      <div className="text-xs">
        <p className="text-muted-foreground">Created by</p>
        <p className="font-medium">Madhusoodhanan KM</p>
      </div>

      <a
        href={GITHUB_REPO_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline break-all"
      >
        <Github className="h-3 w-3" />
        Open on GitHub
      </a>

      <AboutFeatureHighlights />
    </div>
  );
}

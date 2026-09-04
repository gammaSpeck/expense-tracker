import { useNavigate } from "react-router";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import type { ReleaseNoteGroup } from "@/lib/whatsNew";
import type { ReleaseNote } from "@/content/releaseNotes";
import { GITHUB_REPO_LINK } from "@/config";

const TYPE_BADGE_LABEL: Record<ReleaseNote["type"], string> = {
  new: "New",
  improved: "Improved",
  fixed: "Fixed",
};

function Badge({ label }: { label: string }) {
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground">
      {label}
    </span>
  );
}

function NoteCard({ note, onNavigate }: { note: ReleaseNote; onNavigate?: () => void }) {
  const navigate = useNavigate();

  return (
    <div className="p-3 rounded-lg bg-muted/50 space-y-1.5">
      <div className="flex flex-wrap items-center gap-1">
        <Badge label={TYPE_BADGE_LABEL[note.type]} />
        {note.isSecurity && <Badge label="Privacy & security" />}
        {note.needsSetup && <Badge label="Setup needed" />}
        {note.isPreference && <Badge label="Optional setting" />}
      </div>
      <p className="text-sm font-medium">{note.title}</p>
      <p className="text-xs text-muted-foreground">{note.body}</p>
      {(note.action || note.issue) && (
        <div className="flex items-center gap-2">
          {note.action && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs font-normal"
              onClick={() => {
                onNavigate?.();
                navigate(note.action!.to);
              }}
            >
              {note.action.label}
            </Button>
          )}
          {note.issue && (
            <a
              href={`${GITHUB_REPO_LINK}/issues/${note.issue}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline ml-auto shrink-0"
            >
              #{note.issue}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export function WhatsNewList({
  groups,
  onNavigate,
}: {
  groups: ReleaseNoteGroup[];
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.version} className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground">
            v{group.version} ·{" "}
            {group.isPending ? "Coming soon" : format(parseISO(group.date), "dd MMM yyyy")}
          </h3>
          <div className="space-y-1.5">
            {group.notes.map((note) => (
              <NoteCard key={note.id} note={note} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

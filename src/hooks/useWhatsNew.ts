import { useState } from "react";
import { config } from "@/config";
import { userPreferences } from "@/db/userPreferences";
import { RELEASE_NOTES } from "@/content/releaseNotes";
import {
  compareVersions,
  groupNotes,
  groupsSince,
  previousVersion,
  selectVisibleNotes,
  shouldAutoOpen,
  type ReleaseNoteGroup,
} from "@/lib/whatsNew";

// Snapshot at module load: initializeDatabase() writes the install marker inside a startup
// effect, so reading it at import time always observes the pre-startup state.
const hadPriorInstall = userPreferences.getInstallMarker() !== null;

export function visibleGroups(): ReleaseNoteGroup[] {
  const visibleNotes = selectVisibleNotes(RELEASE_NOTES, config.appVersion, config.env === "production");
  return groupNotes(visibleNotes, config.appVersion);
}

export function markWhatsNewSeen(): void {
  const groups = visibleGroups();
  const target = groups[0]?.version ?? config.appVersion;
  const stored = userPreferences.getWhatsNewState();

  if (!stored || compareVersions(stored.lastSeenVersion, target) < 0) {
    userPreferences.setWhatsNewState({ lastSeenVersion: target, lastSeenAt: new Date().toISOString() });
  }
}

function resolveLastSeenVersion(): string | null {
  const stored = userPreferences.getWhatsNewState();
  if (stored) return stored.lastSeenVersion;

  const groups = visibleGroups();

  if (!hadPriorInstall) {
    // Brand-new install: sees no dialog (it has no update to hear about) but still gets every
    // future announcement, and the full history stays browsable from Settings.
    const target = groups[0]?.version ?? config.appVersion;
    userPreferences.setWhatsNewState({ lastSeenVersion: target, lastSeenAt: new Date().toISOString() });
    return target;
  }

  // Existing install adopting the feature: announce only the newest version group, never the
  // whole back catalogue. Nothing is written on this path, so state settles when the user views it.
  return previousVersion(groups);
}

interface WhatsNewHookState {
  unseen: ReleaseNoteGroup[];
  open: boolean;
  dismiss: () => void;
}

function getInitialWhatsNewState(): { unseen: ReleaseNoteGroup[]; open: boolean } {
  const unseen = groupsSince(visibleGroups(), resolveLastSeenVersion());
  return { unseen, open: shouldAutoOpen(unseen) };
}

export function useWhatsNew(): WhatsNewHookState {
  const [state, setState] = useState(() => getInitialWhatsNewState());

  const dismiss = () => {
    setState((prev) => ({ ...prev, open: false }));
    markWhatsNewSeen();
  };

  return { unseen: state.unseen, open: state.open, dismiss };
}

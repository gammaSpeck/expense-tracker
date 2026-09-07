import type { ReleaseNote } from "@/content/releaseNotes";

export interface ReleaseNoteGroup {
  version: string;
  date: string; // newest note date in the group
  isPending: boolean; // version newer than the running build
  notes: ReleaseNote[];
}

export const MAX_DIALOG_GROUPS = 3;

// Plain "x.y.z" compare — release-please (release-type: node) never emits prerelease suffixes, so
// three numeric segments are enough. Non-numeric segments count as 0. Never throws on malformed
// input; it sorts as 0.0.0.
export function compareVersions(a: string, b: string): number {
  const segmentsA = a.split(".");
  const segmentsB = b.split(".");

  for (let i = 0; i < 3; i++) {
    const numA = Number.parseInt(segmentsA[i] ?? "", 10) || 0;
    const numB = Number.parseInt(segmentsB[i] ?? "", 10) || 0;
    if (numA !== numB) return numA - numB;
  }

  return 0;
}

// Pending notes (authored for a version not yet tagged) are visible everywhere except production:
// update-staging.yml pushes main to staging while package.json still carries the previously
// released version, so staging code is always ahead of its version number.
export function selectVisibleNotes(
  notes: readonly ReleaseNote[],
  appVersion: string,
  isProduction: boolean,
): ReleaseNote[] {
  if (!isProduction) return [...notes];
  return notes.filter((note) => compareVersions(note.version, appVersion) <= 0);
}

function noteRank(note: ReleaseNote): number {
  if (note.isSecurity) return 0;
  if (note.needsSetup) return 1;
  if (note.type === "new") return 2;
  if (note.type === "improved") return 3;
  return 4;
}

export function groupNotes(notes: ReleaseNote[], appVersion: string): ReleaseNoteGroup[] {
  const byVersion = new Map<string, ReleaseNote[]>();
  for (const note of notes) {
    const group = byVersion.get(note.version);
    if (group) {
      group.push(note);
    } else {
      byVersion.set(note.version, [note]);
    }
  }

  const groups: ReleaseNoteGroup[] = Array.from(byVersion.entries()).map(([version, groupNotesList]) => {
    const sortedNotes = [...groupNotesList].sort((a, b) => {
      const rankDiff = noteRank(a) - noteRank(b);
      if (rankDiff !== 0) return rankDiff;
      return b.date.localeCompare(a.date);
    });

    const date = sortedNotes.reduce((latest, note) => (note.date > latest ? note.date : latest), sortedNotes[0].date);

    return {
      version,
      date,
      isPending: compareVersions(version, appVersion) > 0,
      notes: sortedNotes,
    };
  });

  return groups.sort((a, b) => compareVersions(b.version, a.version));
}

export function groupsSince(
  groups: ReleaseNoteGroup[],
  lastSeenVersion: string | null,
): ReleaseNoteGroup[] {
  if (lastSeenVersion === null) return groups;
  return groups.filter((group) => compareVersions(group.version, lastSeenVersion) > 0);
}

// A release carrying only unflagged improved/fixed notes never interrupts the user.
export function shouldAutoOpen(groups: ReleaseNoteGroup[]): boolean {
  return groups.some((group) =>
    group.notes.some((note) => note.type === "new" || note.isSecurity || note.needsSetup),
  );
}

export function previousVersion(groups: ReleaseNoteGroup[]): string | null {
  return groups[1]?.version ?? null;
}

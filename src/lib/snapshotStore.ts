// Origin Private File System (OPFS) primitives for the automatic local safety-copy snapshot
// (Tier 1 of the auto-backup feature). A manifest is the "latest" pointer: OPFS has no portable
// atomic rename, so a snapshot filename alone can never be the commit point. The manifest is
// written last — a snapshot interrupted mid-write is never referenced by it and is deleted as an
// orphan the next time this module prunes.
import type { Category, Expense } from "@/types/expense";

const BACKUP_DIR = "backups";
export const RETAIN_SNAPSHOTS = 8;

export interface SnapshotManifestEntry {
  name: string;
  writtenAt: string; // ISO
  expenseCount: number;
  /** Max `Expense.updatedAt` at snapshot time — lets the caller detect "nothing changed" without
   *  re-reading the snapshot file. ISO-8601 strings compare correctly with `<`/`>`. */
  maxUpdatedAt: string;
  /** Attachments were stripped to fit under a tight storage quota. */
  partial?: boolean;
}

export interface SnapshotManifest {
  /** Name of the newest snapshot file in this directory. */
  latest: string;
  /** Newest first, length <= RETAIN_SNAPSHOTS. */
  history: SnapshotManifestEntry[];
  schemaVersion: number;
  writtenAt: string;
}

export interface SnapshotPayload {
  exportDate: string;
  version: string;
  schemaVersion: number;
  expenses: Expense[];
  categories: Category[];
}

export function opfsAvailable(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.storage?.getDirectory === "function";
}

async function getBackupsDir(create: boolean): Promise<FileSystemDirectoryHandle | null> {
  if (!opfsAvailable()) return null;
  try {
    const root = await navigator.storage.getDirectory();
    return await root.getDirectoryHandle(BACKUP_DIR, { create });
  } catch {
    return null;
  }
}

export async function readManifest(): Promise<SnapshotManifest | null> {
  const dir = await getBackupsDir(false);
  if (!dir) return null;
  try {
    const file = await (await dir.getFileHandle("manifest.json")).getFile();
    return JSON.parse(await file.text()) as SnapshotManifest;
  } catch {
    return null;
  }
}

export async function readSnapshot(name: string): Promise<SnapshotPayload | null> {
  const dir = await getBackupsDir(false);
  if (!dir) return null;
  try {
    const file = await (await dir.getFileHandle(name)).getFile();
    return JSON.parse(await file.text()) as SnapshotPayload;
  } catch {
    return null;
  }
}

export class SnapshotQuotaError extends Error {
  constructor() {
    super("Not enough storage quota for a snapshot");
    this.name = "SnapshotQuotaError";
  }
}

/** Deletes every file in `dir` that the new manifest's history no longer references. */
async function pruneOrphans(dir: FileSystemDirectoryHandle, manifest: SnapshotManifest): Promise<void> {
  const keep = new Set(manifest.history.map((entry) => entry.name));
  const names: string[] = [];
  for await (const name of dir.keys()) {
    if (name !== "manifest.json" && !keep.has(name)) names.push(name);
  }
  await Promise.all(names.map((name) => dir.removeEntry(name).catch(() => {})));
}

/**
 * Writes `text` (a JSON-serialized `SnapshotPayload`, plaintext — this never leaves the origin
 * sandbox) as a new snapshot, verifies it by re-reading and comparing expense counts, then
 * commits the manifest last and prunes every file the new manifest no longer references.
 */
export async function commitSnapshot(
  text: string,
  opts: { partial?: boolean } = {},
  retain: number = RETAIN_SNAPSHOTS,
): Promise<SnapshotManifest> {
  const dir = await getBackupsDir(true);
  if (!dir) throw new Error("OPFS unavailable");

  const parsed = JSON.parse(text) as SnapshotPayload;
  const name = `snapshot-${Date.now()}.json`;

  try {
    const handle = await dir.getFileHandle(name, { create: true });
    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();

    const reread = JSON.parse(await (await handle.getFile()).text()) as SnapshotPayload;
    if (!Array.isArray(reread.expenses) || reread.expenses.length !== parsed.expenses.length) {
      throw new Error("Snapshot verification failed: expense count mismatch after write");
    }
  } catch (err) {
    await dir.removeEntry(name).catch(() => {});
    if (err instanceof DOMException && err.name === "QuotaExceededError") throw new SnapshotQuotaError();
    throw err;
  }

  const previous = await readManifest();
  const entry: SnapshotManifestEntry = {
    name,
    writtenAt: parsed.exportDate,
    expenseCount: parsed.expenses.length,
    maxUpdatedAt: parsed.expenses.reduce((max, e) => (e.updatedAt > max ? e.updatedAt : max), ""),
    ...(opts.partial ? { partial: true as const } : {}),
  };
  const history = [entry, ...(previous?.history ?? [])].slice(0, retain);
  const manifest: SnapshotManifest = {
    latest: name,
    history,
    schemaVersion: parsed.schemaVersion,
    writtenAt: entry.writtenAt,
  };

  const manifestHandle = await dir.getFileHandle("manifest.json", { create: true });
  const manifestWritable = await manifestHandle.createWritable();
  await manifestWritable.write(JSON.stringify(manifest));
  await manifestWritable.close();

  await pruneOrphans(dir, manifest);
  return manifest;
}

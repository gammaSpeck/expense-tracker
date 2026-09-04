import { describe, expect, it } from "bun:test";
import { groupNotes, groupsSince, selectVisibleNotes, shouldAutoOpen } from "@/lib/whatsNew";
import type { ReleaseNote } from "@/content/releaseNotes";

const fixtures: ReleaseNote[] = [
  { id: "1.8.0-a", version: "1.8.0", date: "2026-09-04", type: "new", title: "New thing", body: "…" },
  {
    id: "1.7.0-a",
    version: "1.7.0",
    date: "2026-09-02",
    type: "new",
    title: "Bulk add",
    body: "…",
  },
  {
    id: "1.7.0-b",
    version: "1.7.0",
    date: "2026-09-01",
    type: "fixed",
    title: "Security fix",
    body: "…",
    isSecurity: true,
  },
  {
    id: "1.5.2-a",
    version: "1.5.2",
    date: "2026-08-09",
    type: "fixed",
    title: "Data loss guard",
    body: "…",
  },
  {
    id: "1.5.1-a",
    version: "1.5.1",
    date: "2026-03-22",
    type: "fixed",
    title: "Long passphrase",
    body: "…",
  },
  {
    id: "1.5.0-a",
    version: "1.5.0",
    date: "2026-03-16",
    type: "improved",
    title: "Only improved",
    body: "…",
  },
];

describe("selectVisibleNotes", () => {
  it("excludes notes newer than appVersion in production", () => {
    const visible = selectVisibleNotes(fixtures, "1.7.0", true);
    expect(visible.some((note) => note.version === "1.8.0")).toBe(false);
  });

  it("includes everything and marks the group pending outside production", () => {
    const visible = selectVisibleNotes(fixtures, "1.7.0", false);
    expect(visible.some((note) => note.version === "1.8.0")).toBe(true);

    const groups = groupNotes(visible, "1.7.0");
    const pendingGroup = groups.find((group) => group.version === "1.8.0");
    expect(pendingGroup?.isPending).toBe(true);
  });
});

describe("groupNotes", () => {
  it("orders groups newest version first", () => {
    const groups = groupNotes([...fixtures], "1.8.0");
    expect(groups.map((group) => group.version)).toEqual(["1.8.0", "1.7.0", "1.5.2", "1.5.1", "1.5.0"]);
  });

  it("puts a security note ahead of a plain new note within a group", () => {
    const groups = groupNotes([...fixtures], "1.8.0");
    const group170 = groups.find((group) => group.version === "1.7.0");
    expect(group170?.notes.map((note) => note.id)).toEqual(["1.7.0-b", "1.7.0-a"]);
  });
});

describe("groupsSince", () => {
  const groups = groupNotes([...fixtures], "1.8.0");

  it("returns only groups newer than the given version", () => {
    const since = groupsSince(groups, "1.5.0");
    expect(since.map((group) => group.version)).toEqual(["1.8.0", "1.7.0", "1.5.2", "1.5.1"]);
  });

  it("returns an empty array once caught up to the newest group", () => {
    expect(groupsSince(groups, "1.8.0")).toEqual([]);
  });
});

describe("shouldAutoOpen", () => {
  it("is false for a group of only unflagged improved/fixed notes", () => {
    const groups = groupNotes(
      [{ id: "x", version: "1.0.0", date: "2026-01-01", type: "fixed", title: "t", body: "b" }],
      "1.0.0",
    );
    expect(shouldAutoOpen(groups)).toBe(false);
  });

  it("is true when a fixed note carries isSecurity", () => {
    const groups = groupNotes(
      [
        {
          id: "x",
          version: "1.0.0",
          date: "2026-01-01",
          type: "fixed",
          title: "t",
          body: "b",
          isSecurity: true,
        },
      ],
      "1.0.0",
    );
    expect(shouldAutoOpen(groups)).toBe(true);
  });
});

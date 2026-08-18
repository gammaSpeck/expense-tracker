// Issue -> PR pipeline driver: plan (opus) -> implement (sonnet) -> gate -> push
// -> draft PR -> review (opus) -> TLDR report. Three separate `omp` processes,
// each a clean context window; this driver owns branch creation, the
// verification gate, push, PR creation, and the final report — never a model.
//
// ponytail: single Bun script, no deps beyond node:fs/node:path + Bun's own
// spawn APIs. Every step is "run a command, fail loudly".
//
// Usage: bun .omp/agent-issue.ts <issue-number> [--dry-run]

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = process.cwd();

const PLAN_MODEL = "claude-opus-5";
const IMPL_MODEL = "claude-sonnet-5";
const REVIEW_MODEL = "claude-opus-5";
const PLAN_BUDGET = "20m";
const IMPL_BUDGET = "45m";
const FIX_BUDGET = "20m";
const REVIEW_BUDGET = "15m";
const MAX_FIX_ATTEMPTS = 2;

type Issue = {
  number: number;
  title: string;
  body: string;
  labels: { name: string }[];
  comments: { author: { login: string }; body: string; createdAt: string }[];
};

type FixRecord = { label: string; attempts: number };

// label -> shell command, in gate execution order.
const GATE_COMMANDS: Record<string, string> = {
  "commits present": 'test "$(git rev-list --count origin/main..HEAD)" -gt 0',
  "bun run typecheck": "bun run typecheck",
  "bun run typecheck:e2e": "bun run typecheck:e2e",
  "bun run lint": "bun run lint",
  "bunx playwright test --project=chromium-desktop": "bunx playwright test --project=chromium-desktop",
  "bunx fallow health --score --min-score 95": "bunx fallow health --score --min-score 95",
};

// ---- process helpers -------------------------------------------------

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

function run(cmd: string[]): { code: number; out: string } {
  const res = Bun.spawnSync(cmd, { cwd: REPO_ROOT, stdout: "pipe", stderr: "inherit" });
  return { code: res.exitCode ?? 1, out: new TextDecoder().decode(res.stdout).trim() };
}

function runShellCapture(cmd: string): { code: number; out: string } {
  const res = Bun.spawnSync(["sh", "-c", `${cmd} 2>&1`], { cwd: REPO_ROOT, stdout: "pipe" });
  return { code: res.exitCode ?? 1, out: new TextDecoder().decode(res.stdout) };
}

function runInherit(cmd: string[]): number {
  const res = Bun.spawnSync(cmd, { cwd: REPO_ROOT, stdout: "inherit", stderr: "inherit", stdin: "inherit" });
  return res.exitCode ?? 1;
}

async function runTee(cmd: string[], outFile: string): Promise<number> {
  const proc = Bun.spawn(cmd, { cwd: REPO_ROOT, stdout: "pipe", stderr: "inherit" });
  const chunks: Buffer[] = [];
  for await (const chunk of proc.stdout) {
    const buf = Buffer.from(chunk);
    chunks.push(buf);
    process.stdout.write(buf);
  }
  const code = await proc.exited;
  writeFileSync(outFile, Buffer.concat(chunks));
  return code;
}

function readIfExists(path: string): string {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

// last N lines of combined command output, for the fix-loop message.
function tailLines(text: string, n: number): string {
  const lines = text.split("\n");
  return lines.slice(Math.max(0, lines.length - n)).join("\n");
}

// ---- issue -> names ------------------------------------------------------

function fetchIssue(n: string): Issue {
  const res = run(["gh", "issue", "view", n, "--json", "number,title,body,labels,comments"]);
  if (res.code !== 0) fail(`gh issue view ${n} failed`);
  return JSON.parse(res.out) as Issue;
}

function deriveNames(n: string, issue: Issue) {
  const slug = issue.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  const type = issue.labels.some((l) => l.name === "bug") ? "fix" : "feat";
  const branch = `${type}/issue-${n}-${slug}`;
  const runDir = join(".omp", "agent-runs", `issue-${n}`);
  const implDir = join(runDir, "impl");
  return { slug, type, branch, runDir, implDir };
}

function buildIssueBlock(n: string, issue: Issue): string {
  const labels = issue.labels.length > 0 ? issue.labels.map((l) => l.name).join(", ") : "none";
  const body = issue.body && issue.body.trim().length > 0 ? issue.body : "_(no description)_";
  const lines = [`## Issue #${n}: ${issue.title}`, "", `Labels: ${labels}`, "", body];
  if (issue.comments.length > 0) {
    lines.push("");
    for (const c of issue.comments) lines.push(`### @${c.author.login} (${c.createdAt})`, "", c.body, "");
  }
  return `${lines.join("\n").trimEnd()}\n`;
}

// ---- shared prompt blocks -------------------------------------------------

const REPO_CONVENTIONS_BLOCK = [
  "## Repo test conventions (MUST follow)",
  "",
  "- New specs live at `tests/e2e/<feature>.spec.ts`.",
  '- `import { test, expect } from "../support/fixtures";` — NEVER from `@playwright/test`. The',
  "  wrapper installs the network/localStorage harness and fails any test that logs a console error.",
  "- Navigate with `gotoApp(page, path)` from `tests/support/app.ts`; it waits for the Dexie",
  "  category seed to land.",
  "- Seed data with `seedExpenses(page, items)` from `tests/support/db.ts`, using builders from",
  "  `tests/support/data.ts` (`mixed5()`, `thisMonth3()`, `thisMonthNoAdhoc()`, `twelveToday()`,",
  "  `manyRows(n)`). `gotoApp` MUST run before `seedExpenses` — it resolves category names to ids",
  "  and throws when a category is missing.",
  "- Query with `getByRole` / `getByText` / `getByTestId` (`testIdAttribute` is `data-testid`).",
  '- Add `{ tag: "@smoke" }` only if the test must also run against deployed environments.',
  "- Run one spec: `bunx playwright test --project=chromium-desktop tests/e2e/<feature>.spec.ts`",
  "  — it builds and previews the app on port 4173 automatically.",
].join("\n");

const HARD_RULES_BLOCK = [
  "## Hard rules",
  "",
  "- NEVER weaken, skip, delete, or `.fixme` an existing test to get to green.",
  "- Do NOT touch `.github/**`, `CHANGELOG.md` (release-please owns it), `package.json`",
  "  dependencies, or `.omp/hooks/**`.",
  "- Do NOT `git push` and do NOT create a pull request. The driver does both, after its own",
  "  verification gate.",
  "- Do NOT add a dependency. If you are convinced one is required, stop and say why in the",
  "  commit body instead of installing it.",
  "- Commit only the source, tests, and config you actually changed. `.omp/agent-runs/` is",
  "  gitignored — never commit it.",
  "- NEVER call the `ask` tool: this run is headless and the call will fail.",
].join("\n");

function renderPlanPrompt(n: string, issueBlock: string): string {
  return [
    `# Plan GitHub issue #${n} for this repo. Do not implement it.`,
    "",
    issueBlock,
    "---",
    "",
    "Read `skill://ponytail` now and obey it: the laziest solution that actually works,",
    "existing repo helpers before new code, shortest working diff. Delete before you add.",
    "",
    "You are READ-ONLY for this run. Investigate as much as you like, but NEVER create, edit,",
    "delete, or rename any file, and NEVER run a state-changing command (`git commit`,",
    "`git checkout`, `bun install`). Another session implements this plan.",
    "",
    "NEVER call the `ask` tool: this run is headless and the call will fail. Decide, and record",
    'the decision under "Assumptions".',
    "",
    "Output the plan to stdout as plain markdown with no preamble, using exactly these sections:",
    "",
    "## Goal",
    "One or two sentences: what changes and why, in terms of the issue.",
    "",
    "## Test first (TDD)",
    "The exact new spec path under `tests/e2e/`, the exact `test()` title, and the exact",
    "assertion that is RED today. Name the assertion that flips from failing to passing. If the",
    "issue needs no new assertion, say so in one line and explain what existing spec covers it.",
    "",
    "## Changes",
    "Ordered, concrete steps. Each names exact files and symbols, and the existing helper it",
    "reuses. New code only with a one-line statement that no equivalent exists. State the",
    "handling for each empty/missing/error path, or say why none is needed.",
    "",
    "## Out",
    "One line per part of the issue deliberately not built, with the reason.",
    "",
    "## Assumptions",
    "Decisions made without confirmation, each with the fallback if it turns out wrong.",
    "",
    "## Repo conventions the implementer must follow",
    REPO_CONVENTIONS_BLOCK,
    "",
    HARD_RULES_BLOCK,
  ].join("\n");
}

function renderImplPrompt(n: string, issueBlock: string, runDir: string): string {
  return [
    `# Implement the approved plan for GitHub issue #${n}`,
    "",
    `Read \`${runDir}/plan.md\` first. It is the approved plan and it is authoritative: implement it`,
    "exactly as written, top-to-bottom. You did not draft it; the choices in it are already made.",
    "Do not re-plan and do not request approval.",
    "",
    issueBlock,
    "---",
    "",
    "Read `skill://ponytail` now and obey it: shortest working diff, no unrequested abstractions.",
    "",
    "## Order of work",
    "",
    '1. Write the new spec first, exactly as the plan\'s "Test first" section specifies. Run it.',
    "   Confirm it FAILS for the intended reason — not a typo, bad selector, or missing seed.",
    "2. Make the source change.",
    "3. Run the spec again. Confirm it passes.",
    "4. Run `bun run typecheck`, `bun run typecheck:e2e`, `bun run lint`.",
    "5. Commit with a Conventional Commits subject: `<type>(<scope>): <subject>`, type `feat` or `fix`.",
    `6. Write \`${runDir}/tldr.md\` (structure below).`,
    `7. Write \`${runDir}/handoff.md\` (structure below). This is the last thing you do.`,
    "",
    REPO_CONVENTIONS_BLOCK,
    "",
    HARD_RULES_BLOCK,
    "",
    `## \`${runDir}/tldr.md\` — for the human, terse`,
    "",
    "## What changed",
    "## How it works",
    "## Root cause and fix",
    "Only when this issue was a bug: the actual root cause, and why the fix addresses it.",
    "Omit this section entirely for a feature.",
    "## Tests added",
    "Spec path, test title, and the one assertion that proves the behavior.",
    "",
    `## \`${runDir}/handoff.md\` — for the reviewing session`,
    "",
    "Write a handoff document for another instance of yourself. It MUST be sufficient for",
    "seamless continuation without access to this conversation. Capture exact technical state,",
    "not abstractions: file paths, symbol names, commands run, test results, observed failures,",
    "decisions made. Use exactly this structure:",
    "",
    "## Goal",
    "[What the user is trying to accomplish]",
    "## Constraints & Preferences",
    "- [Any constraints, preferences, or requirements mentioned]",
    "## Progress",
    "### Done",
    "- [x] [Completed tasks with specifics]",
    "### In Progress",
    "- [ ] [Current work if any]",
    "### Pending",
    "- [ ] [Tasks mentioned but not started]",
    "## Key Decisions",
    "- **[Decision]**: [Rationale]",
    "## Critical Context",
    "- Code snippets, file paths, function/type names, error messages, data essential to continue",
    "- Repository state if relevant",
    "## Next Steps",
    "1. [What should happen next]",
    "",
    "The `handoff.md` structure above is omp's own handoff-document format, reused verbatim rather than invented.",
  ].join("\n");
}

function renderReviewPrompt(n: string, issueBlock: string, runDir: string, handoffContent: string): string {
  return [
    `# Performance and security review of GitHub issue #${n}`,
    "",
    handoffContent,
    "",
    "The above is a handoff document from the session that implemented this change. Use it as",
    "your starting context.",
    "",
    issueBlock,
    "---",
    "",
    "Read `skill://ponytail-review` now and obey it.",
    "",
    `The change is the unified diff at \`${runDir}/diff.patch\` (this branch vs \`origin/main\`).`,
    "Read the surrounding source for anything the diff does not make obvious.",
    "",
    "You are READ-ONLY: NEVER create, edit, delete, or rename any file, and NEVER run a",
    "state-changing command. NEVER call the `ask` tool.",
    "",
    "Answer exactly these, in this order, terse, one line per finding with `file:line`:",
    "",
    "## 1. Performance",
    "Render/re-render cost, list and query work that grows with row count, Dexie/IndexedDB",
    "access patterns, bundle-size impact of any new import. Name the concrete input size at",
    "which each finding starts to matter.",
    "",
    "## 2. Security",
    "Untrusted input handling, XSS via rendered strings, anything widening the Netlify CSP,",
    'secrets or PII reaching logs, analytics, or `localStorage`. Say "none found" when clean —',
    "do not pad.",
    "",
    "## 3. Test integrity",
    "Does the new Playwright spec genuinely fail without the source change? Point at the",
    "assertion that would break. If it would pass either way, say so plainly.",
    "",
    "## 4. Over-engineering",
    "What to delete or simplify: location, what to cut, what replaces it.",
    "",
    "## 5. Verdict",
    "One line: `ship`, `ship with follow-ups`, or `needs work`, plus the single most important",
    "reason.",
    "",
    "Output plain markdown to stdout, no preamble.",
  ].join("\n");
}

// ---- sessions ------------------------------------------------------------

async function execPlanSession(cmd: string[], planMdPath: string, baseSha: string): Promise<void> {
  console.log(`\n--- session 1: plan (${PLAN_MODEL}) ---`);
  const code = await runTee(cmd, planMdPath);

  const status = run(["git", "status", "--porcelain"]).out;
  const head = run(["git", "rev-parse", "HEAD"]).out;
  if (status.length > 0 || head !== baseSha) fail("plan session modified the repository");

  const planMd = readIfExists(planMdPath);
  if (code !== 0 || planMd.length < 200) fail("plan session produced no usable plan");
}

function execImplSession(cmd: string[], runDir: string): void {
  console.log(`\n--- session 2: implement (${IMPL_MODEL}) ---`);
  const code = runInherit(cmd);
  if (code !== 0) fail(`implement session exited ${code}; see ${runDir}`);
}

function resolveSessionFile(implDir: string): string {
  const files = readdirSync(implDir).filter((f) => f.endsWith(".jsonl"));
  if (files.length === 0) fail("omp wrote no session file; cannot run the fix loop");
  if (files.length > 1) fail(`omp wrote multiple session files in ${implDir}; expected exactly one`);
  return join(implDir, files[0] as string);
}

// ---- verification gate + bounded fix loop --------------------------------

function fixMessage(cmd: string, code: number, tail: string, runDir: string): string {
  return [
    "The verification gate failed.",
    "",
    `Command: ${cmd}`,
    `Exit code: ${code}`,
    "",
    "Output (last 200 lines):",
    tail,
    "",
    "Fix the root cause. NEVER weaken, skip, or delete a test to make it pass. Re-run",
    `\`${cmd}\` yourself and confirm it is green, then commit the fix with a Conventional`,
    `Commits subject. If you changed what the code does, update \`${runDir}/tldr.md\` and`,
    `\`${runDir}/handoff.md\` to match.`,
  ].join("\n");
}

async function runGate(runDir: string, sessionFile: string): Promise<FixRecord[]> {
  const lastFailedAttempt = new Map<string, number>();
  let fixAttempts = 0;

  for (;;) {
    let failure: { label: string; cmd: string; code: number; tail: string } | null = null;
    for (const [label, cmd] of Object.entries(GATE_COMMANDS)) {
      const res = runShellCapture(cmd);
      if (res.code !== 0) {
        console.error(`\u2717 ${label} (exit ${res.code})`);
        if (label === "commits present") console.error("agent finished but made no commits");
        failure = { label, cmd, code: res.code, tail: tailLines(res.out, 200) };
        break;
      }
      console.log(`\u2713 ${label}`);
    }
    if (!failure) break;

    if (fixAttempts >= MAX_FIX_ATTEMPTS) {
      fail(`gate failed after ${MAX_FIX_ATTEMPTS} fix attempt(s): ${failure.label}\nsee ${runDir}`);
    }
    fixAttempts++;
    lastFailedAttempt.set(failure.label, fixAttempts);
    console.log(`\n--- fix attempt ${fixAttempts}/${MAX_FIX_ATTEMPTS}: ${failure.label} ---`);
    const msg = fixMessage(failure.cmd, failure.code, failure.tail, runDir);
    const code = runInherit([
      "omp",
      "-p",
      "--model",
      IMPL_MODEL,
      "--thinking",
      "high",
      "--max-time",
      FIX_BUDGET,
      "--auto-approve",
      "-r",
      sessionFile,
      msg,
    ]);
    if (code !== 0) fail(`fix session exited ${code}; see ${runDir}`);
  }

  return [...lastFailedAttempt.entries()].map(([label, attempts]) => ({ label, attempts }));
}

// ---- push, PR, review, report --------------------------------------------

function pushAndOpenPr(runDir: string, branch: string, n: string, type: string, issueTitle: string): string {
  if (run(["git", "push", "-u", "origin", branch]).code !== 0) fail("git push failed");

  const subjects = run(["git", "log", "--format=%s", "origin/main..HEAD"]).out.split("\n").filter(Boolean);
  const title = subjects.length > 0 ? (subjects[subjects.length - 1] as string) : `${type}: ${issueTitle}`;

  const tldr = readIfExists(join(runDir, "tldr.md")).trim();
  const planMd = readIfExists(join(runDir, "plan.md")).trim();
  const prBody = [
    `Closes #${n}`,
    "",
    tldr.length > 0 ? tldr : "_no summary captured_",
    "",
    "<details>",
    "<summary>Plan (claude-opus-5)</summary>",
    "",
    planMd,
    "",
    "</details>",
    "",
    "Local gate: `typecheck`, `typecheck:e2e`, `lint`, `playwright --project=chromium-desktop`, `fallow health --min-score 95` — all green.",
  ].join("\n");
  const prBodyPath = join(runDir, "pr-body.md");
  writeFileSync(prBodyPath, prBody);

  const prRes = run([
    "gh",
    "pr",
    "create",
    "--draft",
    "--base",
    "main",
    "--head",
    branch,
    "--title",
    title,
    "--body-file",
    prBodyPath,
  ]);
  if (prRes.code !== 0) fail("gh pr create failed");
  const outLines = prRes.out.split("\n").filter(Boolean);
  return (outLines[outLines.length - 1] as string) ?? "";
}

async function runReviewSession(runDir: string, n: string, issueBlock: string, prUrl: string): Promise<void> {
  const diffPatchPath = join(runDir, "diff.patch");
  writeFileSync(diffPatchPath, `${run(["git", "diff", "origin/main...HEAD"]).out}\n`);

  const reviewPromptPath = join(runDir, "review-prompt.md");
  const handoff = readIfExists(join(runDir, "handoff.md")).trim();
  const handoffContent = handoff.length > 0 ? handoff : "_(no handoff document was written)_";
  writeFileSync(reviewPromptPath, renderReviewPrompt(n, issueBlock, runDir, handoffContent));

  const reviewMdPath = join(runDir, "review.md");
  const cmd = [
    "omp",
    "-p",
    "--no-session",
    "--model",
    REVIEW_MODEL,
    "--thinking",
    "high",
    "--max-time",
    REVIEW_BUDGET,
    "--auto-approve",
    `@${reviewPromptPath}`,
  ];
  console.log(`\n--- session 3: review (${REVIEW_MODEL}) ---`);
  const headBefore = run(["git", "rev-parse", "HEAD"]).out;
  await runTee(cmd, reviewMdPath);
  const status = run(["git", "status", "--porcelain"]).out;
  const headAfter = run(["git", "rev-parse", "HEAD"]).out;
  if (status.length > 0 || headAfter !== headBefore) fail("review session modified the repository");

  const reviewMd = readIfExists(reviewMdPath).trim();
  if (reviewMd.length > 0) {
    if (run(["gh", "pr", "comment", prUrl, "--body-file", reviewMdPath]).code !== 0) {
      console.error(`warning: gh pr comment failed for ${prUrl}`);
    }
  } else {
    console.error("warning: review.md missing or empty; skipping PR comment");
  }
}

function buildReport(
  runDir: string,
  n: string,
  issueTitle: string,
  prUrl: string,
  branch: string,
  fixed: FixRecord[],
): string {
  const commitCount = run(["git", "rev-list", "--count", "origin/main..HEAD"]).out;
  const shortstat = run(["git", "diff", "--shortstat", "origin/main...HEAD"]).out;
  const commits = run(["git", "log", "--format=- %h %s", "origin/main..HEAD"]).out;
  const tldr = readIfExists(join(runDir, "tldr.md")).trim();
  const review = readIfExists(join(runDir, "review.md")).trim();

  const gateLines = Object.keys(GATE_COMMANDS).map((label) => `- [x] ${label}`);
  for (const f of fixed) gateLines.push(`- fixed after ${f.attempts} attempt(s): ${f.label}`);

  return [
    `# Issue #${n} \u2192 ${prUrl}`,
    "",
    `**${issueTitle}**`,
    `Branch \`${branch}\` \u00b7 ${commitCount} commit(s) \u00b7 ${shortstat}`,
    "",
    "## Summary",
    tldr.length > 0 ? tldr : "_no summary captured_",
    "",
    "## Review",
    review.length > 0 ? review : "_review did not run_",
    "",
    "## Gate",
    ...gateLines,
    "",
    "## Commits",
    commits,
    "",
    "## Artifacts",
    `\`${runDir}/\` — plan.md, tldr.md, handoff.md, review.md, diff.patch, impl/ (session log)`,
  ].join("\n");
}

// ---- dry run ---------------------------------------------------------

function printDryRun(
  runDir: string,
  branch: string,
  files: string[],
  planCmd: string[],
  implCmd: string[],
  fixCmdExample: string[],
  reviewCmd: string[],
): void {
  console.log(`branch: ${branch}`);
  console.log("\nwritten files:");
  for (const f of files) console.log(`  ${f}`);
  console.log("\ngate commands:");
  for (const cmd of Object.values(GATE_COMMANDS)) console.log(`  ${cmd}`);
  console.log("\nomp commands:");
  console.log(`  ${planCmd.join(" ")}`);
  console.log(`  ${implCmd.join(" ")}`);
  console.log(`  ${fixCmdExample.join(" ")}`);
  console.log(`  ${reviewCmd.join(" ")}`);
  console.log(`\n${runDir} would hold the run's artifacts; no branch created, nothing pushed.`);
}

// ---- main ------------------------------------------------------------

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const n = argv.find((a) => !a.startsWith("--"));
  if (!n || !/^\d+$/.test(n)) {
    console.error("usage: bun .omp/agent-issue.ts <issue-number> [--dry-run]");
    process.exit(1);
  }

  if (run(["gh", "auth", "status"]).code !== 0) fail("gh is not authenticated; run `gh auth login`");
  if (run(["git", "status", "--porcelain"]).out.length > 0) {
    fail("working tree is dirty; commit or stash first");
  }
  if (!dryRun && run(["git", "fetch", "origin", "main"]).code !== 0) fail("git fetch origin main failed");

  const issue = fetchIssue(n);
  const { branch, type, runDir, implDir } = deriveNames(n, issue);

  if (!dryRun) {
    const branchRes = run(["git", "rev-parse", "--verify", "--quiet", `refs/heads/${branch}`]);
    if (branchRes.code === 0) fail(`branch ${branch} already exists; delete it or finish that run first`);
  }

  if (dryRun) {
    mkdirSync(implDir, { recursive: true });
  } else {
    rmSync(runDir, { recursive: true, force: true });
    mkdirSync(implDir, { recursive: true });
  }

  const issueBlock = buildIssueBlock(n, issue);
  const planPromptPath = join(runDir, "plan-prompt.md");
  const implPromptPath = join(runDir, "impl-prompt.md");
  const reviewPromptPath = join(runDir, "review-prompt.md");
  const planMdPath = join(runDir, "plan.md");

  writeFileSync(planPromptPath, renderPlanPrompt(n, issueBlock));
  writeFileSync(implPromptPath, renderImplPrompt(n, issueBlock, runDir));

  const planCmd = [
    "omp",
    "-p",
    "--no-session",
    "--model",
    PLAN_MODEL,
    "--thinking",
    "high",
    "--max-time",
    PLAN_BUDGET,
    "--auto-approve",
    `@${planPromptPath}`,
  ];
  const implCmd = [
    "omp",
    "-p",
    "--model",
    IMPL_MODEL,
    "--thinking",
    "high",
    "--max-time",
    IMPL_BUDGET,
    "--auto-approve",
    "--session-dir",
    implDir,
    `@${implPromptPath}`,
  ];
  const reviewCmd = [
    "omp",
    "-p",
    "--no-session",
    "--model",
    REVIEW_MODEL,
    "--thinking",
    "high",
    "--max-time",
    REVIEW_BUDGET,
    "--auto-approve",
    `@${reviewPromptPath}`,
  ];
  const fixCmdExample = [
    "omp",
    "-p",
    "--model",
    IMPL_MODEL,
    "--thinking",
    "high",
    "--max-time",
    FIX_BUDGET,
    "--auto-approve",
    "-r",
    join(implDir, "<session>.jsonl"),
    "<fix message>",
  ];

  if (dryRun) {
    writeFileSync(
      reviewPromptPath,
      renderReviewPrompt(n, issueBlock, runDir, "_(unavailable in --dry-run: handoff.md not yet written)_"),
    );
    printDryRun(
      runDir,
      branch,
      [planPromptPath, implPromptPath, reviewPromptPath],
      planCmd,
      implCmd,
      fixCmdExample,
      reviewCmd,
    );
    return;
  }

  if (run(["git", "checkout", "-b", branch, "origin/main"]).code !== 0) {
    fail(`git checkout -b ${branch} origin/main failed`);
  }
  const baseSha = run(["git", "rev-parse", "HEAD"]).out;

  await execPlanSession(planCmd, planMdPath, baseSha);
  execImplSession(implCmd, runDir);

  const sessionFile = resolveSessionFile(implDir);
  const tldrPath = join(runDir, "tldr.md");
  const handoffPath = join(runDir, "handoff.md");
  if (!existsSync(tldrPath)) console.error(`warning: missing ${tldrPath}; continuing with an empty summary section`);
  if (!existsSync(handoffPath)) {
    console.error(`warning: missing ${handoffPath}; continuing with an empty handoff section`);
  }

  const fixed = await runGate(runDir, sessionFile);

  const prUrl = pushAndOpenPr(runDir, branch, n, type, issue.title);
  await runReviewSession(runDir, n, issueBlock, prUrl);

  const report = buildReport(runDir, n, issue.title, prUrl, branch, fixed);
  writeFileSync(join(runDir, "report.md"), `${report}\n`);
  console.log(`\n${report}`);
}

await main();

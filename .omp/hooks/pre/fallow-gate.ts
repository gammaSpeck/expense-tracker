// Blocks the agent's `git commit` / `git push` when `fallow audit` returns
// verdict "fail". Mirrors the gate fallow ships for Claude Code, ported to omp's
// `tool_call` event. Fails OPEN on every error path: a broken gate must not
// wedge the agent.
//
// ponytail: structural type instead of importing ExtensionAPI from
// @oh-my-pi/pi-coding-agent — adding the harness as a devDependency of an
// expense tracker to borrow one interface is not worth it. Widen this if the
// hook ever needs more of the API surface.
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

type ToolCallEvent = { toolName: string; input: Record<string, unknown> };
type BlockResult = { block: true; reason: string } | undefined;
type HookApi = {
  on(
    event: "tool_call",
    handler: (event: ToolCallEvent, ctx: { cwd: string }) => Promise<BlockResult>,
  ): void;
};

// Matches `git commit` / `git push` as a real command word, including after a
// pipe, `&&`, `;`, or a subshell paren — not the substring "git push" inside an
// unrelated argument or commit message.
const GIT_WRITE = /(^|[\s;|&(])git\s+(commit|push)(\s|$)/;

const AUDIT_TIMEOUT_MS = 120_000;

export default function fallowGate(pi: HookApi): void {
  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName !== "bash") return;
    if (!GIT_WRITE.test(String(event.input.command ?? ""))) return;

    let stdout = "";
    try {
      const res = await run(
        "bunx",
        ["fallow", "audit", "--format", "json", "--quiet", "--explain", "--gate-marker", "agent"],
        { cwd: ctx.cwd, timeout: AUDIT_TIMEOUT_MS, maxBuffer: 32 * 1024 * 1024 },
      );
      stdout = res.stdout;
    } catch (err) {
      // fallow exits 1 on verdict "fail", so execFile rejects on a real block.
      // Recover stdout and let the verdict below decide; anything without
      // parseable stdout is an infrastructure failure and passes through.
      const errStdout = err && typeof err === "object" && "stdout" in err ? err.stdout : undefined;
      stdout = String(errStdout ?? "");
    }

    let report: { verdict?: string; error?: boolean; summary?: unknown };
    try {
      report = JSON.parse(stdout) as typeof report;
    } catch {
      return; // fallow missing, crashed, or non-JSON output: fail open.
    }

    // `{ error: true }` is fallow's runtime-error envelope (bad ref, not a git
    // repo, config error). Documented as fail-open so a fresh clone with no
    // merge-base can still commit.
    if (report.error === true || report.verdict !== "fail") return;

    return {
      block: true,
      reason:
        "fallow audit verdict: fail. Fix the findings below, then retry the commit.\n" +
        `${stdout}\n` +
        "Run `bunx fallow audit` locally to re-check. This gate only fails on findings " +
        "this changeset introduced (gate=new-only); inherited findings are reported but " +
        "do not block.",
    };
  });
}

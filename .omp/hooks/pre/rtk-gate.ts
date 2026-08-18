// Enforces RTK.md's "always prefix shell commands with rtk" default: blocks a
// bash call that has an RTK equivalent and tells the agent the exact
// rtk-prefixed command to retry with, instead of relying on the agent
// remembering the convention every turn.
//
// Delegates the rewrite decision to `rtk rewrite <cmd>` — the same single
// source of truth RTK's own official integrations (Pi, Claude Code, Cursor,
// Gemini CLI, ...) call; see RTK.md and rtk-ai.app/docs. `rtk rewrite`
// can't be ported as a silent input-mutating hook here (omp's `tool_call`
// contract is gate-only: `{ block, reason }` or nothing — no input rewrite),
// so this blocks and hands back the answer instead of rewriting transparently.
// Fails open on every error path: a broken/missing rtk must not wedge the agent.
//
// ponytail: structural type instead of importing ExtensionAPI from
// @oh-my-pi/pi-coding-agent — mirrors fallow-gate.ts's reasoning, same repo,
// same tradeoff. Widen this if the hook ever needs more of the API surface.
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

const REWRITE_TIMEOUT_MS = 2_000;

export default function rtkGate(pi: HookApi): void {
  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName !== "bash") return;
    const cmd = String(event.input.command ?? "").trim();
    if (!cmd || cmd === "rtk" || cmd.startsWith("rtk ")) return;

    let stdout = "";
    let exitCode = 0;
    try {
      const res = await run("rtk", ["rewrite", cmd], { cwd: ctx.cwd, timeout: REWRITE_TIMEOUT_MS });
      stdout = res.stdout.trim();
    } catch (err) {
      // `rtk rewrite` exits 1 (no output) when the command has no RTK
      // equivalent — execFile rejects on any non-zero code, so recover it
      // here rather than treating it as an infrastructure failure.
      const e = err as { code?: number; stdout?: string };
      if (typeof e?.code !== "number") return; // rtk missing, timed out, killed — fail open
      exitCode = e.code;
      stdout = String(e.stdout ?? "").trim();
    }

    // Exit 1: no RTK equivalent for this command — nothing to enforce.
    if (exitCode === 1 || !stdout || stdout === cmd) return;

    return {
      block: true,
      reason:
        "RTK.md: this repo defaults to rtk-wrapped shell commands. Retry as:\n" +
        `${stdout}\n` +
        "(commands with no RTK equivalent run through unblocked. If this rewrite is wrong for what " +
        'you need — exact/unfiltered output, a shape rtk mishandled — bypass with `rtk run -c "<original command>"`, ' +
        "which is never gated since it already starts with `rtk `.)",
    };
  });
}

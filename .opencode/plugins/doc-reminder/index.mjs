// OpenCode port of the Claude Code Stop hook and Cursor stop hook
// (.claude/hooks/doc-reminder.mjs, .cursor/hooks/doc-reminder.mjs).
//
// OpenCode does not read Claude settings.json or Cursor hooks.json, and it has
// no "stop" hook with a shell command. The equivalent is a session `context`
// hook: before a model request is dispatched, inspect the current worktree and,
// when code changed without a recognized documentation update, append a
// non-blocking reminder to the system instructions of that request.
//
// Differences from the hook it ports:
// - It also counts commits on the current branch, so the reminder still works
//   after the workflow's per-unit commits. The source hook only saw uncommitted
//   changes and went silent exactly when work was ready to ship.
// - The reminder reaches the model (system instruction) instead of the host UI.
// - It is injected at most once per session, on the first model request where
//   the condition is true, so it lands near the end of a change rather than
//   after the session stops.
//
// Plain ESM with no build or type-check step, like the hooks it ports. OpenCode
// loads it directly and `node --check` parses it. Requires Node.js and Git on
// PATH. Safe no-op outside a git repo.
import { execFileSync } from "node:child_process"

const REMINDER =
  "Docs reminder: code changed but no project doc or agent-metadata.md update was found. " +
  "If this change was significant, update verified project records before shipping."

// No shell: args are passed as an array straight to git.
function git(cwd, args) {
  return execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "ignore"] }).toString()
}

// Porcelain v1 -z uses NUL-separated records. A rename/copy has a second path
// record; include both names so path classification is correct on either side.
function parsePorcelain(porcelain) {
  const records = porcelain.split("\0")
  if (records[records.length - 1] === "") records.pop()

  const files = []
  for (let i = 0; i < records.length; i += 1) {
    const record = records[i]
    if (record.length < 4 || record[2] !== " ") continue
    const status = record.slice(0, 2)
    files.push(record.slice(3))
    if (status.includes("R") || status.includes("C")) {
      if (i + 1 < records.length) files.push(records[++i])
    }
  }
  return files
}

// Default branch to compare against, when the checkout has one.
function resolveBase(root) {
  try {
    const ref = git(root, ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"]).trim()
    if (ref) return ref
  } catch {
    // no origin/HEAD — fall through to the usual names
  }
  for (const candidate of ["origin/main", "origin/master", "main", "master"]) {
    try {
      git(root, ["rev-parse", "--verify", "--quiet", `${candidate}^{commit}`])
      return candidate
    } catch {
      // not this one
    }
  }
  return undefined
}

// Files this branch changed relative to its default branch, so committed work is
// still checked. Empty on the default branch itself, where the merge base is HEAD.
function branchFiles(root) {
  const base = resolveBase(root)
  if (!base) return []
  try {
    return git(root, ["diff", "--name-only", "-z", `${base}...HEAD`]).split("\0").filter(Boolean)
  } catch {
    return []
  }
}

// True when code changed without a recognized documentation update.
function classify(files) {
  let docsUpdated = false
  let codeChanged = false

  for (const file of files) {
    if (file === "agent-metadata.md" || file.startsWith("docs/")) {
      docsUpdated = true
    } else if (
      file.startsWith(".claude/") ||
      file.startsWith(".cursor/") ||
      file.startsWith(".opencode/") ||
      file.startsWith(".github/") ||
      file.endsWith(".md") ||
      file.startsWith("LICENSE") ||
      file === "opencode.json"
    ) {
      // housekeeping, not code — ignore
    } else {
      codeChanged = true
    }
  }

  return codeChanged && !docsUpdated
}

// Read the repository on every request. A handful of git calls costs
// milliseconds and model requests are seconds apart, so nothing is cached; a
// cached `true` would keep nudging after the matching doc update landed.
function needsDocReminder(directory) {
  try {
    const root = git(directory, ["rev-parse", "--show-toplevel"]).replace(/\r?\n$/, "")
    const files = new Set(parsePorcelain(git(root, ["status", "--porcelain=v1", "-z", "--untracked-files=all"])))
    for (const file of branchFiles(root)) files.add(file)
    return classify([...files])
  } catch {
    return false
  }
}

export default {
  id: "doc-reminder",
  async setup(ctx) {
    const reminded = new Set()
    const directory = ctx.location?.directory ?? process.cwd()

    await ctx.session.hook("context", (event) => {
      if (reminded.has(event.sessionID)) return
      if (!needsDocReminder(directory)) return
      event.system.push({ type: "text", text: REMINDER })
      reminded.add(event.sessionID)
    })

    return () => reminded.clear()
  },
}

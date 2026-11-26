// Single owner of the docs-reminder rules. Host adapters (.agents/hooks, .claude/hooks,
// .cursor/hooks, .opencode/plugins) only translate the returned text to their hook protocol.
// Plain ESM; needs Node.js and Git on PATH. Every function is a safe no-op outside a git repo.
import { execFileSync } from 'node:child_process';

const DOCS = /^docs\//;
const HOUSEKEEPING =
  /^(?:\.agents|\.claude|\.cursor|\.opencode|\.github)\/|\.md$|^LICENSE|^opencode\.json$/;
const EXPRESS_CORE = /^api\/src\/(?:(?:app|server)\.ts$|(?:.*\/)?(?:middlewares?|errors)\/)/;

export const REMINDER =
  'Docs reminder: code changed but no docs/ update was found. ' +
  'If significant, update the owning doc (AGENTS.md routing table) before shipping.';
export const EXPRESS_REMINDER =
  'Express core files changed: re-check docs/standards/express-conventions.md.';

const git = (cwd, ...args) => execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'ignore'] }).toString();

// Porcelain v1 -z: NUL-separated records; a rename/copy carries a second path record.
function parsePorcelain(porcelain) {
  const records = porcelain.split('\0');
  if (records.at(-1) === '') records.pop();
  const files = [];
  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    if (record.length < 4 || record[2] !== ' ') continue;
    files.push(record.slice(3));
    if (/[RC]/.test(record.slice(0, 2)) && i + 1 < records.length) files.push(records[++i]);
  }
  return files;
}

// Files this branch changed relative to the default branch, so committed work is still checked.
function branchFiles(root) {
  let base;
  try {
    base = git(root, 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD').trim();
  } catch {
    for (const name of ['origin/main', 'origin/master', 'main', 'master']) {
      try {
        git(root, 'rev-parse', '--verify', '--quiet', `${name}^{commit}`);
        base = name;
        break;
      } catch {
        // try the next candidate
      }
    }
  }
  if (!base) return [];
  try {
    return git(root, 'diff', '--name-only', '-z', `${base}...HEAD`).split('\0').filter(Boolean);
  } catch {
    return [];
  }
}

/** Reminder text for a list of changed paths, or null when none is due. */
export function reminderFor(files) {
  const docsUpdated = files.some((f) => DOCS.test(f));
  const codeChanged = files.some((f) => !DOCS.test(f) && !HOUSEKEEPING.test(f));
  if (!codeChanged || docsUpdated) return null;
  return files.some((f) => EXPRESS_CORE.test(f)) ? `${REMINDER}\n${EXPRESS_REMINDER}` : REMINDER;
}

/** Reminder for the repository containing `cwd`; `includeBranch` also counts committed branch work. */
export function docReminder(cwd, { includeBranch = false } = {}) {
  try {
    const root = git(cwd, 'rev-parse', '--show-toplevel').replace(/\r?\n$/, '');
    const files = new Set(parsePorcelain(git(root, 'status', '--porcelain=v1', '-z', '--untracked-files=all')));
    if (includeBranch) for (const file of branchFiles(root)) files.add(file);
    return reminderFor([...files]);
  } catch {
    return null;
  }
}

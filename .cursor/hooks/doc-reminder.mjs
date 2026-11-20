#!/usr/bin/env node
// Cursor stop hook — docs nudge (requires Node.js and Git on PATH).
//
// Mirrors the Claude Code reminder but checks the current worktree, not session
// history. Git-root-relative paths make it work from the root or nested api/ cwd.
// On stop, code changes without a recognized docs update return {followup_message},
// which Cursor auto-submits. `loop_limit` in hooks.json bounds re-fires. Safe no-op
// outside a git repo.
//
// Note: Cursor passes stop-event JSON on stdin; we don't need it (the signal is the
// git working tree), so stdin is ignored. Uses execFileSync with an argv array (no
// shell) to avoid injection/quoting issues.
import { execFileSync } from 'node:child_process';

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'ignore'] });
}

let root = '';
try {
  root = git(process.cwd(), 'rev-parse', '--show-toplevel').toString().replace(/\r?\n$/, '');
} catch {
  process.exit(0);
}

let porcelain;
try {
  porcelain = git(root, 'status', '--porcelain=v1', '-z', '--untracked-files=all').toString();
} catch {
  process.exit(0);
}

// Porcelain v1 -z uses NUL-separated records. A rename/copy has a second path
// record; include both names so path classification is correct on either side.
const records = porcelain.split('\0');
if (records[records.length - 1] === '') records.pop();
const files = [];
for (let i = 0; i < records.length; i += 1) {
  const record = records[i];
  if (record.length < 4 || record[2] !== ' ') continue;
  const status = record.slice(0, 2);
  files.push(record.slice(3));
  if (status.includes('R') || status.includes('C')) {
    if (i + 1 < records.length) files.push(records[++i]);
  }
}
if (files.length === 0) process.exit(0);

let docsUpdated = false;
let codeChanged = false;
for (const f of files) {
  if (f === 'agent-metadata.md' || f.startsWith('docs/')) {
    docsUpdated = true;
  } else if (
    f.startsWith('.claude/') || f.startsWith('.cursor/') ||
    f.startsWith('.github/') || f.endsWith('.md') || f.startsWith('LICENSE')
  ) {
    // housekeeping, not code — ignore
  } else {
    codeChanged = true;
  }
}

if (codeChanged && !docsUpdated) {
  const message =
    'Docs reminder: code changed but no project doc or agent-metadata.md update was found. ' +
    'was updated. If this change was significant, update verified project records before finishing.';
  process.stdout.write(JSON.stringify({ followup_message: message }) + '\n');
}
process.exit(0);

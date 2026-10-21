#!/usr/bin/env node
// Stop-hook nudge (non-blocking, cross-platform: mac / Linux / Windows).
//
// Check the current worktree for code changes and recognized documentation updates.
// Resolve paths from the Git root, so this works from the root or nested api/ cwd;
// this does not track changes across the session. Safe no-op outside a git repo.
//
// Requires Node.js and Git on PATH. Running directly avoids a shell wrapper.
//
// Output contract: Claude Code Stop hooks read JSON on stdout. We emit
// {"systemMessage": "..."} to surface a non-blocking reminder, and exit 0 so the
// session still stops. Emitting nothing = no reminder.
import { execFileSync } from 'node:child_process';

// No shell: args are passed as an array straight to git. Buffer output preserves
// porcelain's NUL delimiters, including for paths containing spaces or newlines.
function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'ignore'] });
}

let root = '';
try {
  root = git(process.cwd(), 'rev-parse', '--show-toplevel').toString().replace(/\r?\n$/, '');
} catch {
  process.exit(0); // not a git repo — nothing to check
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
  if (
    f === 'agent-metadata.md' || f === 'docs/project-context.md' ||
    f.startsWith('docs/work/') || f.startsWith('docs/adr/') || f.startsWith('api/docs/')
  ) {
    docsUpdated = true; // recognized root docs, api docs, or metadata were touched
  } else if (
    f.startsWith('docs/') || f.startsWith('.claude/') || f.startsWith('.cursor/') ||
    f.startsWith('.github/') || f.endsWith('.md') || f.startsWith('LICENSE')
  ) {
    // housekeeping, not code — ignore
  } else {
    codeChanged = true;
  }
}

if (codeChanged && !docsUpdated) {
  const message =
    'Docs reminder: code changed but no work doc, project context, ADR, api/docs page, or agent-metadata.md ' +
    'was updated. If this change was significant, update verified project records before shipping.';
  process.stdout.write(JSON.stringify({ systemMessage: message }) + '\n');
}
process.exit(0);

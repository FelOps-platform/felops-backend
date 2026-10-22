#!/usr/bin/env bash
# Credential-free validation for this repository's Agent Seed adaptation.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

for helper in bin/diff.sh bin/check-agent-workflow.sh; do
  bash -n "$helper"
done
node --check .claude/hooks/doc-reminder.mjs
node --check .cursor/hooks/doc-reminder.mjs

node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';

const read = (file) => readFileSync(file, 'utf8');
const files = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const file = path.join(dir, entry.name);
  return entry.isDirectory() ? files(file) : [file];
});

assert.match(read('CLAUDE.md'), /AGENTS\.md as the canonical repository guidance/);
for (const dir of ['commands', 'skills']) {
  const claude = files(`.claude/${dir}`);
  const cursor = files(`.cursor/${dir}`);
  assert.deepEqual(claude.map((f) => f.slice(8)).sort(), cursor.map((f) => f.slice(8)).sort());
  for (const file of claude) assert.equal(read(file), read(file.replace('.claude/', '.cursor/')), file);
}
for (const host of ['.claude', '.cursor']) {
  for (const role of ['explorer', 'implementer', 'reviewer']) {
    const file = `${host}/agents/${role}.md`;
    assert.match(read(file), /^model: inherit$/m, file);
  }
}

const claude = JSON.parse(read('.claude/settings.json'));
const cursor = JSON.parse(read('.cursor/hooks.json'));
const claudeHook = claude.hooks.Stop[0].hooks[0];
assert.equal(claudeHook.command, 'node');
assert.deepEqual(claudeHook.args, ['${CLAUDE_PROJECT_DIR}/.claude/hooks/doc-reminder.mjs']);
assert.equal(cursor.hooks.stop[0].command, 'node .cursor/hooks/doc-reminder.mjs');
assert.equal(cursor.hooks.stop[0].loop_limit, 2);

// Resolve local Markdown links in workflow records; leave URLs and template placeholders alone.
const docs = [
  'AGENTS.md',
  'agent-metadata.md',
  ...files('docs'),
  ...files('.cursor/rules'),
  '.github/PULL_REQUEST_TEMPLATE.md',
];
for (const file of docs.filter((f) => f.endsWith('.md') || f.endsWith('.mdc'))) {
  for (const match of read(file).matchAll(/\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    const target = match[1];
    if (/^(?:[a-z][a-z\d+.-]*:|#)/i.test(target) || /[<>\[\]]/.test(target)) continue;
    const local = decodeURIComponent(target.split('#')[0]);
    assert.ok(existsSync(path.resolve(path.dirname(file), local)), `${file}: missing ${target}`);
  }
}

// Exercise the configured launch forms, not just the scripts. Claude substitutes
// its project placeholder into argv; Cursor project hooks run from the root.
const fixture = mkdtempSync(path.join(tmpdir(), 'felops-agent-workflow-'));
try {
  for (const dir of ['.claude/hooks', '.cursor/hooks', 'api/src', 'api/docs']) {
    mkdirSync(path.join(fixture, dir), { recursive: true });
  }
  for (const host of ['.claude', '.cursor']) {
    copyFileSync(`${host}/hooks/doc-reminder.mjs`, path.join(fixture, host, 'hooks/doc-reminder.mjs'));
  }
  const git = (...args) => execFileSync('git', args, { cwd: fixture, stdio: 'ignore' });
  const run = (host, nested = false) => {
    if (host === 'claude') {
      const args = claudeHook.args.map(arg => arg.replace('${CLAUDE_PROJECT_DIR}', fixture));
      return execFileSync(claudeHook.command, args, {
        cwd: nested ? path.join(fixture, 'api') : fixture,
        encoding: 'utf8',
      }).trim();
    }
    // Use the actual command in its documented project-hook working directory.
    return execFileSync(cursor.hooks.stop[0].command, { cwd: fixture, shell: true, encoding: 'utf8' }).trim();
  };
  git('init', '-q');
  writeFileSync(path.join(fixture, 'api/src/example.ts'), 'export const value = 1;\n');
  git('add', '.');
  git('-c', 'user.name=Workflow Check', '-c', 'user.email=workflow@example.invalid',
    '-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'Fixture');
  assert.equal(run('claude', true), '');
  assert.equal(run('cursor'), '');
  writeFileSync(path.join(fixture, 'api/src/example.ts'), 'export const value = 2;\n');
  assert.ok(JSON.parse(run('claude', true)).systemMessage);
  assert.ok(JSON.parse(run('cursor')).followup_message);
  writeFileSync(path.join(fixture, 'api/docs/workflow.md'), '# Backend workflow\n');
  assert.equal(run('claude', true), '');
  assert.equal(run('cursor'), '');
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
console.log('Agent workflow configuration, adapter parity, local links, and configured hook launches passed.');
NODE

#!/usr/bin/env bash
# Credential-free validation for the OpenCode host configuration.
# Complements bin/check-agent-workflow.sh, which validates the Claude/Cursor
# adapters and stays untouched by the OpenCode addition.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

node --check .opencode/plugins/doc-reminder/index.mjs

node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const read = (file) => readFileSync(file, 'utf8');
const normalize = (text) => text.replace(/\r\n/g, '\n');
const files = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const file = path.join(dir, entry.name);
  return entry.isDirectory() ? files(file) : [file];
});

// Agents are ports: same IDs, subagent mode, no model (V2 has no inherit value),
// and no legacy frontmatter. An OpenCode agent inherits the allow-all base
// policy, so the read-only roles must deny first and re-allow.
for (const role of ['explorer', 'implementer', 'reviewer']) {
  const file = `.opencode/agents/${role}.md`;
  const body = normalize(read(file));
  assert.match(body, /^mode: subagent$/m, file);
  assert.doesNotMatch(body, /^(?:model|name|tools|readonly):/m, file);
  if (role !== 'implementer') {
    assert.match(
      body.split('---')[1],
      /^permissions:\n\s+- action: "\*"\n\s+resource: "\*"\n\s+effect: deny$/m,
      `${file}: read-only role must start from deny-all`,
    );
  }
}

// The `.env` rules only govern the read action, so the read-only roles must not
// reach secret files through a shell command.
const explorer = normalize(read('.opencode/agents/explorer.md'));
for (const command of ['cat', 'head', 'tail', 'wc']) {
  assert.doesNotMatch(explorer, new RegExp(`resource: "${command} \\*"`),
    `explorer must not allow ${command}: it bypasses the .env read prompt`);
}
assert.match(explorer, /resource: "rg \*\.env\*"\n\s+effect: deny/,
  'explorer must deny rg against .env paths');
assert.match(explorer, /resource: "rg \*--hidden\*"\n\s+effect: deny/,
  'explorer must deny rg --hidden');
assert.match(normalize(read('.opencode/agents/reviewer.md')),
  /action: external_directory\n\s+resource: "\*"\n\s+effect: ask/,
  'reviewer must ask before reading outside the repository');

// Commands are verbatim ports, so the two host copies cannot silently diverge.
for (const file of files('.claude/commands')) {
  const target = path.join('.opencode/commands', path.relative('.claude/commands', file));
  assert.ok(existsSync(target), `${target}: missing OpenCode port of ${file}`);
  assert.equal(normalize(read(target)), normalize(read(file)), target);
}

// Project permissions ask before the consequential commands AGENTS.md forbids
// running unattended (migrations, vault/database writes, publishing, pushes).
const config = JSON.parse(read('opencode.json'));
assert.equal(config.$schema, 'https://opencode.ai/config.json');
const asks = new Set(config.permissions.filter((rule) => rule.effect === 'ask').map((rule) => rule.resource));
for (const pattern of ['*database:migrate*', '*supabase *', 'git push *', 'git merge *', 'gh pr merge *']) {
  assert.ok(asks.has(pattern), `opencode.json: missing ask rule for ${pattern}`);
}

// Exercise the reminder plugin in a throwaway repository. It is plain ESM, so
// Node imports the shipped file directly.
const fixture = mkdtempSync(path.join(tmpdir(), 'felops-opencode-check-'));
try {
  for (const dir of ['api/src', 'docs']) mkdirSync(path.join(fixture, dir), { recursive: true });
  const git = (...args) => execFileSync('git', args, { cwd: fixture, stdio: 'ignore' });
  const commit = (message) => git('-c', 'user.name=Config Check', '-c', 'user.email=check@example.invalid',
    '-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', 'commit', '-qm', message);
  git('init', '-q');
  writeFileSync(path.join(fixture, 'api/src/example.ts'), 'export const value = 1;\n');
  git('add', '.');
  commit('Fixture');

  const plugin = (await import(pathToFileURL(path.resolve('.opencode/plugins/doc-reminder/index.mjs')).href)).default;
  assert.equal(plugin.id, 'doc-reminder');
  const openPlugin = async (directory) => {
    const hooks = [];
    await plugin.setup({
      location: { directory },
      session: {
        hook: async (name, callback) => {
          hooks.push({ name, callback });
          return { dispose: async () => {} };
        },
      },
    });
    assert.deepEqual(hooks.map((hook) => hook.name), ['context'], 'doc-reminder registers one context hook');
    return (sessionID) => {
      const event = { sessionID, agent: 'build', system: [], messages: [], options: {} };
      hooks[0].callback(event);
      return event.system.length;
    };
  };
  const remind = await openPlugin(fixture);

  // Clean tree: quiet. Non-git directory: no-op.
  assert.equal(remind('oc-clean'), 0);
  const noRepo = mkdtempSync(path.join(tmpdir(), 'felops-not-a-repo-'));
  try {
    assert.equal((await openPlugin(noRepo))('oc-nogit'), 0, 'non-git directory must be a no-op');
  } finally {
    rmSync(noRepo, { recursive: true, force: true });
  }

  // Code-only change: remind once, then stay quiet for that session.
  writeFileSync(path.join(fixture, 'api/src/example.ts'), 'export const value = 2;\n');
  assert.equal(remind('oc-code'), 1, 'code-only change must remind');
  assert.equal(remind('oc-code'), 0, 'reminder must not repeat in one session');
  assert.equal(remind('oc-other'), 1, 'a different session must still be reminded');

  // Housekeeping under .opencode is not code.
  writeFileSync(path.join(fixture, 'api/src/example.ts'), 'export const value = 1;\n');
  mkdirSync(path.join(fixture, '.opencode'), { recursive: true });
  writeFileSync(path.join(fixture, '.opencode/notes.md'), '# Notes\n');
  assert.equal(remind('oc-housekeeping'), 0, 'host config changes are housekeeping');

  // A recognized doc suppresses the reminder even when code changed.
  writeFileSync(path.join(fixture, 'api/src/example.ts'), 'export const value = 3;\n');
  mkdirSync(path.join(fixture, 'docs/work/example'), { recursive: true });
  writeFileSync(path.join(fixture, 'docs/work/example/plan.md'), '# Plan\n');
  assert.equal(remind('oc-with-docs'), 0, 'a recognized doc must suppress the reminder');

  // Each constitution document suppresses the reminder; use a fresh session for each.
  rmSync(path.join(fixture, 'docs/work'), { recursive: true, force: true });
  for (const [index, doc] of [
    'docs/README.md',
    'docs/project-context.md',
    'docs/architecture.md',
    'docs/database.md',
    'docs/delivery.md',
  ].entries()) {
    writeFileSync(path.join(fixture, doc), '# Constitution document\n');
    assert.equal(remind(`oc-constitution-${index}`), 0, `${doc} must suppress the reminder`);
    rmSync(path.join(fixture, doc));
  }

  // Committed work counts too: per-unit commits must not hide the reminder.
  git('checkout', '--', 'api/src/example.ts');
  rmSync(path.join(fixture, '.opencode/notes.md'));
  rmSync(path.join(fixture, 'docs/work'), { recursive: true, force: true });
  git('checkout', '-qb', 'feature');
  writeFileSync(path.join(fixture, 'api/src/example.ts'), 'export const value = 4;\n');
  git('add', 'api/src/example.ts');
  commit('Feature change');
  assert.equal(remind('oc-committed'), 1, 'committed code without docs must remind');
  mkdirSync(path.join(fixture, 'docs/work/feature'), { recursive: true });
  writeFileSync(path.join(fixture, 'docs/work/feature/plan.md'), '# Plan\n');
  assert.equal(remind('oc-committed-docs'), 0, 'a recognized doc must suppress a committed reminder');
} finally {
  rmSync(fixture, { recursive: true, force: true });
}
console.log('OpenCode agents, commands, plugin, and approval rules passed.');
NODE

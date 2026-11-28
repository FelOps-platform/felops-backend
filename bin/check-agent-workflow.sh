#!/usr/bin/env bash
# Credential-free validation of the agent harness: one canonical source (.agents/ + AGENTS.md),
# thin host adapters, shared hook rules, and anti-duplication guards.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

for helper in bin/diff.sh bin/check-agent-workflow.sh bin/check-backend-docs.sh; do
  bash -n "$helper"
done

node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { existsSync, lstatSync, readFileSync, readdirSync, readlinkSync, realpathSync, mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const read = (file) => readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const lineCount = (file) => read(file).replace(/\n$/, '').split('\n').length;
// Regular files only: symlinks (the intentional .claude/skills link) are never followed.
const walk = (dir) => (existsSync(dir) ? readdirSync(dir, { withFileTypes: true }) : []).flatMap((entry) => {
  const file = `${dir}/${entry.name}`;
  return entry.isDirectory() ? walk(file) : entry.isFile() ? [file] : [];
});
const frontmatter = (file) => {
  const match = read(file).match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(match, `${file}: missing YAML frontmatter`);
  const fm = match[1];
  for (const line of fm.split('\n')) {
    const kv = line.match(/^([a-zA-Z0-9_-]+):\s+(.+)$/);
    if (!kv) continue;
    const val = kv[2].trim();
    const quoted = (val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"));
    if (!quoted && !val.startsWith('[') && !val.startsWith('{') && !/^[>|]/.test(val)) {
      assert.equal(val.includes(': '), false, `${file}: unquoted ": " in YAML scalar ${kv[1]} (quote the value)`);
    }
  }
  return fm;
};
const field = (fm, key) => {
  const raw = fm.match(new RegExp(`^${key}: (.+)$`, 'm'))?.[1]?.trim();
  return raw && raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1) : raw;
};

for (const file of ['.agents/lib/doc-reminder-rules.mjs', '.agents/hooks/doc-reminder.mjs', '.agents/hooks/safety-gate.mjs',
  '.claude/hooks/doc-reminder.mjs', '.cursor/hooks/doc-reminder.mjs', '.opencode/plugins/doc-reminder/index.mjs']) {
  execFileSync('node', ['--check', file]);
}

// --- Entry points: AGENTS.md is the only root rulebook; CLAUDE.md just imports it.
assert.ok(lineCount('AGENTS.md') <= 160, `AGENTS.md must stay <= 160 lines (is ${lineCount('AGENTS.md')})`);
assert.equal(read('CLAUDE.md').trim(), '@AGENTS.md', 'CLAUDE.md must be exactly @AGENTS.md');
for (const gone of ['agent-metadata.md', 'docs/standards/agent-routing.md', 'docs/onboarding', '.opencode/README.md', '.agents/skills.json',
  '.agents/commands', '.agents/workflows', '.cursor/skills', '.cursor/commands', '.claude/commands', '.cursor/rules/00-cursor-workflow.mdc']) {
  assert.equal(existsSync(gone), false, `${gone} must not exist (single canonical owner)`);
}

// --- Skills: valid, unique, and canonical in .agents/skills only.
const skillRoots = ['.agents', '.opencode', '.claude', '.cursor'];
const skillFiles = skillRoots.flatMap(walk).filter((file) => file.endsWith('/SKILL.md'));
const names = new Map();
for (const file of skillFiles) {
  assert.ok(file.startsWith('.agents/skills/'), `${file}: skills live only in .agents/skills`);
  const fm = frontmatter(file);
  const dir = file.split('/').at(-2);
  assert.equal(field(fm, 'name'), dir, `${file}: name must equal its directory`);
  assert.match(field(fm, 'description') ?? '', /^.{20,300}$/, `${file}: needs a one-sentence description (20-300 chars)`);
  assert.equal(names.has(dir), false, `duplicate skill name ${dir}: ${names.get(dir)} and ${file}`);
  names.set(dir, file);
}
const required = ['adr-writer', 'diagnosing-bugs', 'express-api', 'gitbook-docs', 'grill-me-with-doc', 'implementation-planner', 'pr-prep', 'tdd',
  'design', 'implement', 'onboard', 'plan', 'ship'];
assert.deepEqual([...names.keys()].sort(), [...required].sort(), 'unexpected or missing skills');

const claudeSkills = '.claude/skills';
const link = lstatSync(claudeSkills, { throwIfNoEntry: false });
assert.ok(link, '.claude/skills must exist as a symlink to ../.agents/skills');
if (link.isSymbolicLink()) {
  assert.equal(readlinkSync(claudeSkills), '../.agents/skills', '.claude/skills must be a relative symlink to ../.agents/skills');
  assert.equal(realpathSync(claudeSkills), realpathSync('.agents/skills'), '.claude/skills must resolve to .agents/skills');
} else {
  // Git on Windows without core.symlinks writes the link target as a one-line file.
  assert.ok(link.isFile() && read(claudeSkills).trim() === '../.agents/skills', '.claude/skills must be a symlink to ../.agents/skills');
}
if (existsSync('.git')) {
  const tracked = execFileSync('git', ['ls-files', '-s', claudeSkills], { encoding: 'utf8' }).trim();
  assert.match(tracked, /^120000 /, '.claude/skills must be tracked as a symlink (mode 120000)');
}

// --- Cursor rules: glob-scoped pointers only (no always-on prose, no skill mirrors).
for (const file of walk('.cursor/rules')) {
  assert.ok(file.endsWith('.mdc') && !names.has(path.basename(file, '.mdc')), `${file}: mirrors a skill`);
  assert.match(frontmatter(file), /^globs: \S+/m, `${file}: Cursor rules must be glob-scoped`);
  assert.ok(lineCount(file) <= 15, `${file}: keep Cursor rules <= 15 lines`);
}

// --- Role playbooks are canonical; every host adapter is a thin pointer to them.
const roles = ['explorer', 'implementer', 'reviewer'];
for (const role of roles) {
  const file = `.agents/roles/${role}.md`;
  assert.ok(read(file).trim().length > 200, `${file}: must be non-empty`);
  assert.ok(lineCount(file) <= 100, `${file}: keep role playbooks <= 100 lines`);
  for (const host of ['.opencode', '.claude', '.cursor', '.agents']) {
    const adapter = `${host}/agents/${role}.md`;
    const text = read(adapter);
    const body = text.replace(/^---\n[\s\S]*?\n---\n/, '');
    assert.ok(lineCount(adapter) <= 40, `${adapter}: adapters must stay <= 40 lines (is ${lineCount(adapter)})`);
    assert.ok(body.trim().split('\n').length <= 12, `${adapter}: adapter body must be a short pointer`);
    assert.ok(body.includes(`.agents/roles/${role}.md`) && body.includes('AGENTS.md'), `${adapter}: must point at AGENTS.md and its role playbook`);
    const fm = frontmatter(adapter);
    if (host === '.opencode') {
      assert.match(fm, /^mode: subagent$/m, adapter);
      assert.doesNotMatch(fm, /^(?:model|name|tools|readonly):/m, `${adapter}: OpenCode V2 roles carry no model/name/tools`);
    } else {
      assert.match(fm, /^model: inherit$/m, adapter);
      assert.equal(field(fm, 'name'), role, adapter);
    }
  }
}

// --- OpenCode permissions, command wrappers, and opencode.json approval rules.
const rulesOf = (file) => {
  const fm = read(file).match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? '';
  return [...fm.matchAll(/\{action: "?([^",}]+)"?, resource: "([^"]*)", effect: (allow|ask|deny)\}/g)]
    .map(([, action, resource, effect]) => ({ action, resource, effect }));
};
const hasRule = (rules, action, resource, effect) => rules.some((r) => r.action === action && r.resource === resource && r.effect === effect);
for (const role of ['explorer', 'reviewer']) {
  const file = `.opencode/agents/${role}.md`;
  const rules = rulesOf(file);
  assert.ok(hasRule(rules.slice(0, 1), '*', '*', 'deny'), `${file}: read-only role must start from deny-all`);
  assert.ok(hasRule(rules, 'read', '*.env', 'ask') && hasRule(rules, 'read', '*.env.*', 'ask'), `${file}: .env reads must ask`);
  assert.ok(hasRule(rules, 'shell', '*', 'ask'), `${file}: unlisted shell commands must ask`);
  for (const command of ['cat', 'head', 'tail', 'wc']) {
    assert.equal(rules.some((r) => r.resource.startsWith(`${command} `) && r.effect === 'allow'), false,
      `${file}: must not allow ${command}; it bypasses the .env read prompt`);
  }
}
assert.ok(hasRule(rulesOf('.opencode/agents/explorer.md'), 'shell', 'rg *.env*', 'deny'), 'explorer must deny rg against .env paths');
assert.ok(hasRule(rulesOf('.opencode/agents/explorer.md'), 'shell', 'rg *--hidden*', 'deny'), 'explorer must deny rg --hidden');
const ocReviewer = rulesOf('.opencode/agents/reviewer.md');
assert.ok(hasRule(ocReviewer, 'external_directory', '*', 'ask'), 'reviewer must ask before reading outside the repository');
for (const command of ['git push', 'git merge', 'git rebase', 'git reset', 'git clean', 'git commit', 'git checkout', 'git restore', 'git stash', 'npm publish', 'rm']) {
  assert.ok(hasRule(ocReviewer, 'shell', `${command} *`, 'deny'), `reviewer must deny ${command}`);
}
assert.ok(hasRule(rulesOf('.opencode/agents/implementer.md'), 'subagent', '*', 'deny'), 'implementer must not launch subagents');

const ocCommands = readdirSync('.opencode/commands').map((file) => file.replace(/\.md$/, '')).sort();
assert.deepEqual(ocCommands, ['design', 'implement', 'onboard', 'plan', 'ship'], 'OpenCode must expose the full command set');
for (const name of ocCommands) {
  const text = read(`.opencode/commands/${name}.md`);
  assert.match(text, /^---\ndescription: .+\n---\n/, `${name}: command needs a description`);
  assert.ok(text.includes(`.agents/skills/${name}/SKILL.md`) && names.has(name), `${name}: must point at its canonical skill`);
  assert.ok(lineCount(`.opencode/commands/${name}.md`) <= 8, `${name}: commands are wrappers, not copies`);
}

const ocConfig = JSON.parse(read('opencode.json'));
assert.equal(ocConfig.$schema, 'https://opencode.ai/config.json');
const asks = new Set(ocConfig.permissions.filter((rule) => rule.effect === 'ask').map((rule) => rule.resource));
for (const pattern of ['*database:migrate*', '*drizzle-kit *', '*supabase *', 'git push *', 'git merge *', 'git reset --hard *', 'gh pr merge *', 'npm publish *']) {
  assert.ok(asks.has(pattern), `opencode.json: missing ask rule for ${pattern}`);
}

// --- No verbatim prose repeated across canonical docs and skills.
const proseFiles = ['AGENTS.md', 'README.md', 'api/README.md', 'docs/README.md', 'docs/project-context.md', 'docs/delivery.md',
  '.github/PULL_REQUEST_TEMPLATE.md', ...walk('docs/standards'), ...walk('.agents/roles'), ...walk('.agents/skills'), '.agents/README.md']
  .filter((file) => file.endsWith('.md'));
const seen = new Map();
for (const file of proseFiles) {
  for (const raw of read(file).split('\n')) {
    const line = raw.trim();
    if (line.length < 80 || line.startsWith('description:') || line.startsWith('|') || line.startsWith('```')) continue;
    assert.ok(!seen.has(line) || seen.get(line) === file, `duplicated prose in ${seen.get(line)} and ${file}: ${line.slice(0, 70)}...`);
    seen.set(line, file);
  }
}

// --- Hook wiring: every configured launcher resolves to a thin adapter over the shared rules.
const claude = JSON.parse(read('.claude/settings.json'));
const cursor = JSON.parse(read('.cursor/hooks.json'));
const agy = JSON.parse(read('.agents/hooks.json'));
const claudeHook = claude.hooks.Stop[0].hooks[0];
assert.equal(claudeHook.command, 'node');
assert.deepEqual(claudeHook.args, ['${CLAUDE_PROJECT_DIR}/.claude/hooks/doc-reminder.mjs']);
assert.equal(cursor.hooks.stop[0].command, 'node .cursor/hooks/doc-reminder.mjs');
assert.equal(cursor.hooks.stop[0].loop_limit, 2);
const agyReminder = agy['felops-doc-reminder'].PreInvocation[0];
assert.equal(agyReminder.command, 'node hooks/doc-reminder.mjs');
const agyGate = agy['felops-safety'].PreToolUse[0].hooks[0];
assert.equal(agyGate.command, 'node hooks/safety-gate.mjs');
for (const file of ['.agents/hooks/doc-reminder.mjs', '.claude/hooks/doc-reminder.mjs', '.cursor/hooks/doc-reminder.mjs', '.opencode/plugins/doc-reminder/index.mjs']) {
  const text = read(file);
  assert.match(text, /doc-reminder-rules\.mjs/, `${file}: must import the shared rules`);
  assert.doesNotMatch(text, /execFileSync|startsWith|docs\//, `${file}: no duplicated rules or git plumbing`);
  assert.ok(lineCount(file) <= 40, `${file}: keep hook adapters <= 40 lines`);
}

// --- Shared rules, exercised directly.
const rules = await import(pathToFileURL(path.resolve('.agents/lib/doc-reminder-rules.mjs')).href);
assert.equal(rules.reminderFor(['api/src/modules/a/a.service.ts']), rules.REMINDER);
assert.equal(rules.reminderFor(['api/src/modules/a/a.service.ts', 'docs/features/auth.md']), null);
assert.equal(rules.reminderFor(['README.md', '.agents/README.md', '.opencode/x.mjs', '.github/x.yml', 'opencode.json']), null);
for (const core of ['api/src/app.ts', 'api/src/server.ts', 'api/src/middleware/auth.ts', 'api/src/shared/errors/x.ts']) {
  const text = rules.reminderFor([core]);
  assert.ok(text.includes('docs/standards/express-conventions.md'), `${core} should point at the Express handbook`);
  assert.ok(text.split('\n').length <= 3, 'reminders stay terse');
}
assert.equal(rules.reminderFor(['api/src/modules/a/a.controller.ts']).includes('express-conventions'), false);

// --- Launch each configured hook in a throwaway repository.
const fixture = mkdtempSync(path.join(tmpdir(), 'felops-agent-workflow-'));
try {
  for (const file of ['.agents/lib/doc-reminder-rules.mjs', '.agents/hooks/doc-reminder.mjs', '.claude/hooks/doc-reminder.mjs', '.cursor/hooks/doc-reminder.mjs']) {
    mkdirSync(path.join(fixture, path.dirname(file)), { recursive: true });
    copyFileSync(file, path.join(fixture, file));
  }
  mkdirSync(path.join(fixture, 'api/src'), { recursive: true });
  mkdirSync(path.join(fixture, 'docs'), { recursive: true });
  const git = (...args) => execFileSync('git', args, { cwd: fixture, stdio: 'ignore' });
  const commit = (message) => git('-c', 'user.name=Workflow Check', '-c', 'user.email=workflow@example.invalid',
    '-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', 'commit', '-qm', message);
  const write = (file, text) => writeFileSync(path.join(fixture, file), text);
  const runClaude = (nested) => execFileSync(claudeHook.command, claudeHook.args.map((arg) => arg.replace('${CLAUDE_PROJECT_DIR}', fixture)),
    { cwd: nested ? path.join(fixture, 'api') : fixture, encoding: 'utf8' }).trim();
  const runCursor = () => execFileSync(cursor.hooks.stop[0].command, { cwd: fixture, shell: true, encoding: 'utf8' }).trim();
  const runAgy = (conversationId) => {
    const out = execFileSync(agyReminder.command, { cwd: path.join(fixture, '.agents'), shell: true, encoding: 'utf8',
      input: JSON.stringify({ conversationId, workspacePaths: [fixture] }) });
    return JSON.parse(out).injectSteps?.[0]?.systemMessage?.systemMessage ?? '';
  };

  const plugin = (await import(pathToFileURL(path.resolve('.opencode/plugins/doc-reminder/index.mjs')).href)).default;
  assert.equal(plugin.id, 'doc-reminder');
  const openPlugin = async (directory) => {
    const hooks = [];
    await plugin.setup({
      location: { directory },
      session: { hook: async (name, callback) => { hooks.push({ name, callback }); return { dispose: async () => {} }; } },
    });
    assert.deepEqual(hooks.map((hook) => hook.name), ['context'], 'doc-reminder registers one context hook');
    return (sessionID) => {
      const event = { sessionID, agent: 'build', system: [], messages: [], options: {} };
      hooks[0].callback(event);
      return event.system;
    };
  };
  const remindOc = await openPlugin(fixture);

  git('init', '-q', '-b', 'main');
  write('api/src/example.ts', 'export const value = 1;\n');
  write('api/src/app.ts', 'export const app = 1;\n');
  git('add', '.');
  commit('Fixture');
  assert.equal(runClaude(true), '');
  assert.equal(runCursor(), '');
  assert.equal(runAgy('clean'), '');
  assert.equal(remindOc('oc-clean').length, 0);
  const noRepo = mkdtempSync(path.join(tmpdir(), 'felops-not-a-repo-'));
  try {
    assert.equal((await openPlugin(noRepo))('oc-nogit').length, 0, 'non-git directory must be a no-op');
  } finally {
    rmSync(noRepo, { recursive: true, force: true });
  }

  write('api/src/example.ts', 'export const value = 2;\n');
  assert.match(JSON.parse(runClaude(true)).systemMessage, /^Docs reminder/);
  assert.equal(JSON.parse(runClaude(true)).systemMessage.includes('express-conventions'), false);
  assert.match(JSON.parse(runCursor()).followup_message, /^Docs reminder/);
  assert.match(runAgy('c1'), /^Docs reminder/);
  assert.equal(runAgy('c1'), '', 'Antigravity reminds once per conversation');
  assert.match(runAgy('c2'), /^Docs reminder/, 'a new conversation is reminded again');
  assert.match(remindOc('oc-code')[0].text, /^Docs reminder/, 'OpenCode must remind on code-only change');
  assert.equal(remindOc('oc-code').length, 0, 'OpenCode reminder must not repeat in one session');
  assert.equal(remindOc('oc-other').length, 1, 'OpenCode must remind a different session');

  write('api/src/app.ts', 'export const app = 2;\n');
  assert.match(JSON.parse(runClaude(true)).systemMessage, /express-conventions\.md/);

  write('docs/workflow.md', '# Backend workflow\n');
  assert.equal(runClaude(true), '');
  assert.equal(runCursor(), '');
  assert.equal(runAgy('c3'), '');
  assert.equal(remindOc('oc-with-docs').length, 0, 'a recognized doc must suppress the OpenCode reminder');

  // Committed branch work: only OpenCode and Antigravity count it.
  rmSync(path.join(fixture, 'docs/workflow.md'));
  git('checkout', '-q', '.');
  git('checkout', '-qb', 'feature');
  write('api/src/example.ts', 'export const value = 3;\n');
  git('add', 'api/src/example.ts');
  commit('Feature change');
  assert.equal(runClaude(true), '');
  assert.match(runAgy('c4'), /^Docs reminder/);
  assert.equal(remindOc('oc-committed').length, 1, 'committed code without docs must remind in OpenCode');
  write('docs/feature.md', '# Feature\n');
  assert.equal(remindOc('oc-committed-docs').length, 0, 'a recognized doc must suppress a committed OpenCode reminder');
} finally {
  rmSync(fixture, { recursive: true, force: true });
}

// Exercise Antigravity safety-gate.mjs against allow, ask, and empty-stdin inputs.
const runGate = (payload) => JSON.parse(execFileSync(agyGate.command, { cwd: '.agents', shell: true, encoding: 'utf8', input: payload }));
assert.equal(runGate('').decision, 'allow', 'safety-gate must fail open on empty stdin');
assert.equal(runGate(JSON.stringify({ toolCall: { name: 'run_command', args: { CommandLine: 'npm run lint --prefix api' } } })).decision, 'allow');
for (const cmd of ['npm run database:migrate --prefix api', 'git push origin main', 'git merge main', 'git reset --hard HEAD', 'gh pr merge 1']) {
  assert.equal(runGate(JSON.stringify({ toolCall: { name: 'run_command', args: { CommandLine: cmd } } })).decision, 'ask', `safety-gate must ask before: ${cmd}`);
}
console.log('Agent harness: canonical layout, thin adapters, shared hook rules, and hook launches passed.');
NODE

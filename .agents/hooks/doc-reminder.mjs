// Antigravity PreInvocation hook: injects the shared docs reminder once per conversation.
// Rules live in ../lib/doc-reminder-rules.mjs; local state is git-ignored (.agents/.state/).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { docReminder } from '../lib/doc-reminder-rules.mjs';

const stateDir = new URL('../.state/', import.meta.url);
const stateFile = new URL('doc-reminder.json', stateDir);
const load = () => {
  try {
    return JSON.parse(readFileSync(stateFile, 'utf8'));
  } catch {
    return [];
  }
};

let response = {};
try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const id = input.conversationId ?? 'default';
  const seen = load();
  const text = seen.includes(id)
    ? null
    : docReminder(input.workspacePaths?.[0] ?? process.cwd(), { includeBranch: true });
  if (text) {
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(stateFile, JSON.stringify([...seen, id]));
    response = { injectSteps: [{ systemMessage: { systemMessage: text, metadata: { source: 'felops-doc-reminder' } } }] };
  }
} catch {
  // hooks fail open
}
process.stdout.write(JSON.stringify(response));
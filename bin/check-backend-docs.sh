#!/usr/bin/env bash
# Credential-free consistency checks for the repository docs.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const read = (file) => readFileSync(file, 'utf8');
const normalize = (text) => text.replace(/\r\n/g, '\n');
// Regular files only, with forward slashes; symlinks are never followed.
const files = (dir) => (existsSync(dir) ? readdirSync(dir, { withFileTypes: true }) : []).flatMap((entry) => {
  const file = `${dir}/${entry.name}`;
  return entry.isDirectory() ? files(file) : entry.isFile() ? [file] : [];
});

const docsRoot = 'docs';
const privateRoot = 'docs/private';
const docs = files(docsRoot).filter(
  (file) => !file.startsWith(privateRoot) && (file.endsWith('.md') || file.endsWith('.mdx')),
);

assert.ok(existsSync('README.md'), 'repository README must exist');
assert.ok(existsSync('docs/README.md'), 'docs index must exist');
assert.equal(existsSync('docs/backend'), false, 'the old docs/backend tree must be removed');
assert.equal(existsSync('docs/engineering'), false, 'the old docs/engineering group must be removed');
assert.equal(existsSync('docs/clarifications'), false, 'the clarifications folder is removed');
assert.ok(existsSync('docs/api/openapi.client.yaml'), 'client OpenAPI target must exist');
assert.ok(existsSync('docs/api/openapi.internal.yaml'), 'internal OpenAPI target must exist');
const featureFiles = [
  'docs/features/integrations.md',
  'docs/features/actions.md',
  'docs/features/knowledge.md',
  'docs/features/agents.md',
  'docs/features/approvals.md',
  'docs/features/channels.md',
  'docs/features/auth.md',
];

// docs/work/<slug>/ files are historical snapshots; their links are not rewritten or checked.
const historical = (file) => /^docs\/work\/[^/]+\//.test(file);
const assertLocalLinks = (file, text) => {
  if (historical(file)) return;
  for (const match of text.matchAll(/\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    const target = match[1];
    if (/^(?:[a-z][a-z\d+.-]*:|#)/i.test(target) || /[<>[\]]/.test(target)) continue;
    const local = decodeURIComponent(target.split('#')[0]);
    assert.ok(existsSync(path.resolve(path.dirname(file), local)), `${file}: missing local link ${target}`);
  }
};

for (const file of docs) {
  const text = normalize(read(file));
  for (const [index, line] of text.split('\n').entries()) {
    assert.equal(/[ \t]+$/.test(line), false, `${file}:${index + 1}: trailing whitespace`);
  }
  assert.equal((text.match(/```/g) || []).length % 2, 0, `${file}: unbalanced code fences`);
  assert.doesNotMatch(text, /[A-Z][A-Z0-9]*_DISABLED/, `${file}: disabled registry errors are removed`);
  assert.doesNotMatch(text, /^- \*\*(?:AI handoff|Endpoints?):\*\*/m, `${file}: endpoint calls belong inside flow steps`);
  assert.doesNotMatch(text, /^- \*\*Outcome:\*\*/m, `${file}: outcome fields are removed`);
  for (const match of text.matchAll(/^```mermaid\n([\s\S]*?)^```$/gm)) {
    const first = match[1].trim().split('\n')[0];
    assert.match(first, /^(?:stateDiagram-v2|sequenceDiagram|flowchart(?: LR| TD| RL| BT)?)$/, `${file}: invalid Mermaid diagram ${first}`);
  }
  assertLocalLinks(file, text);
}

// Root docs, agent harness docs, and host adapters resolve their local links too.
for (const file of ['AGENTS.md', 'README.md', 'api/README.md', '.github/PULL_REQUEST_TEMPLATE.md',
  ...['.agents', '.opencode', '.claude', '.cursor'].flatMap(files).filter((f) => /\.(?:md|mdc)$/.test(f))]) {
  assertLocalLinks(file, normalize(read(file)));
}

for (const file of featureFiles) {
  const text = normalize(read(file));
  assert.match(text, /^## 1\. Workflows$/m, `${file}: missing workflows section`);
  assert.match(text, /^### /m, `${file}: missing a workflow`);
  assert.doesNotMatch(text, /^### 1\.\d (?:Read|Mutation) Workflows$/m, `${file}: workflow categories are not allowed`);
  assert.doesNotMatch(text, /^### 1\.\d Lifecycles$/m, `${file}: lifecycle categories are not allowed`);
  assert.match(text, /^## \d+\. Future work$/mi, `${file}: missing future work`);
  assert.match(text, /^## \d+\. Decisions$/m, `${file}: missing decisions`);
  assert.doesNotMatch(text, /400 MALFORMED_REQUEST/g, `${file}: request validation uses VALIDATION_ERROR`);
  assert.doesNotMatch(text, /400 VALIDATION_ERROR/g, `${file}: request validation uses 422 VALIDATION_ERROR`);
  assert.doesNotMatch(text, /MCP registry/i, `${file}: built-in tool definitions are code-backed`);
}

const apiPath = 'docs/api/api-design-outline.md';
const aiContractPath = 'docs/ai-service-integration/ai-service-contract.md';
const actionsPath = 'docs/features/actions.md';
const api = normalize(read(apiPath));
const aiContract = normalize(read(aiContractPath));
const actions = normalize(read(actionsPath));
const architecture = normalize(read('docs/architecture.md'));
const designCommand = normalize(read('.agents/skills/design/SKILL.md'));

const integrations = normalize(read('docs/features/integrations.md'));
const auth = normalize(read('docs/features/auth.md'));

assert.match(integrations, /oauth\/start/, 'integrations start OAuth from the Backend');
assert.match(integrations, /integrations\/oauth\/callback/, 'the Backend receives the OAuth callback');
assert.doesNotMatch(integrations, /oauth\/complete|PENDING_EXPIRED|pending connection/, 'pending OAuth flows are removed');
assert.match(architecture, /## Components/, 'architecture indexes the system components');
assert.match(integrations, /ADR-0007/, 'integrations link the OAuth decision');
assert.match(integrations, /frontend localization owns integration names/i, 'frontend owns integration display text');
assert.doesNotMatch(integrations, /provider API key/, 'integration connection uses OAuth, not API keys');
assert.doesNotMatch(integrations, /INTEGRATION_DISABLED/, 'integration definitions have no disabled state');
assert.doesNotMatch(integrations, /SHA-256|client secret|token endpoint|row lock|10-minute/, 'OAuth implementation details stay out of feature docs');
assert.doesNotMatch(architecture, /SHA-256|client secret|token endpoint|row lock|10-minute|AES-256-GCM|authorization code/, 'OAuth implementation details stay out of architecture');
assert.match(actions, /Custom HTTP actions/, 'custom actions must remain in future work');
assert.doesNotMatch(actions, /^### .*custom action/m, 'custom action workflows are deferred');
assert.match(actions, /code registry/, 'built-in action definitions live in code');
assert.match(actions, /Action descriptions in the code registry are LLM-facing/i, 'action descriptions are LLM-facing');
assert.match(actions, /frontend renders localized action names/i, 'frontend owns action display text');
assert.match(actions, /Set workspace action availability/, 'workspace action availability has a workflow');
assert.match(actions, /ACTION_UNAVAILABLE/, 'unavailable enable attempts use a stable error');
assert.match(actions, /stateDiagram-v2/, 'workspace action availability has a state diagram');
assert.match(actions, /No row means enabled by default/, 'workspace action settings are sparse');
assert.match(actions, /preserves stored grants for disabled or unavailable actions/, 'disabled grants are preserved');
assert.match(actions, /Invalid credentials do not delete settings or agent grants/, 'invalid credentials preserve action state');
assert.match(integrations, /deletes workspace action settings and agent action grants/, 'disconnect cleanup is explicit');
assert.match(integrations, /invalid connection can be reconnected in place/, 'invalid connections reconnect without deleting state');
assert.match(integrations, /preserving workspace action settings and agent grants/, 'reconnect preserves action configuration');
assert.match(actions, /all workspace actions from connected integrations/i, 'agent action picker is workspace-wide');
assert.doesNotMatch(actions, /GET \/workspaces\/{workspace_id}\/agents\/{agent_id}\/actions/, 'assigned actions come from agent detail');
assert.doesNotMatch(actions, /available-action list/i, 'the action picker is described as a workspace action list');
assert.doesNotMatch(actions, /actions\/\{action_id\}/, 'action detail uses a stable tool key');
assert.match(actions, /actions\/\{tool_key\}/, 'action detail uses a stable tool key');

assert.match(api, /## 3\. Formatting/, 'API outline must define shared formatting');
assert.match(api, /## 4\. Common status codes/, 'API outline must define common errors');
assert.match(api, /404.*NOT_FOUND/s, 'API outline must define not-found handling');
assert.match(api, /tools\/call/, 'API outline must include tool execution');
assert.match(api, /channels\/\{channel_id\}/, 'API outline must include channel instance editing');
assert.doesNotMatch(api, /channels\/\{channel_key\}/, 'channel routes use numeric channel IDs');
assert.match(api, /channel_type/, 'channel instances include a channel type');
assert.doesNotMatch(api, /channels\/types/, 'channel type discovery endpoint is removed');
assert.doesNotMatch(api, /CHANNEL_DISABLED|INTEGRATION_DISABLED/, 'code registries have no disabled state');
assert.match(api, /Pagination policy/i, 'API outline must define pagination policy');
assert.match(api, /assignedActions/, 'agent detail includes assigned actions');
assert.match(api, /assignedSources/, 'agent detail includes assigned sources');
assert.match(api, /not paginated|without pagination/i, 'agent detail assigned sets are not paginated');
assert.doesNotMatch(api, /GET \/workspaces\/{workspace_id}\/agents\/{agent_id}\/(?:actions|knowledge)/, 'assigned sets come from agent detail');
assert.doesNotMatch(api, /selectedToolKeys|selectedSourceIds/, 'agent detail does not duplicate selected IDs');
assert.match(api, /OpenAPI generation notes/, 'API outline must include OpenAPI generation guidance');
assert.match(api, /Basic information → Assign Actions → Configure Knowledge → Review & save/, 'agent creation has four steps');
assert.match(api, /Creation fields: name and instructions/, 'agent creation matches the Basic information form');
assert.match(api, /Frontend localization owns static labels, descriptions, and category labels/, 'frontend owns static display text');
assert.doesNotMatch(api, /displayName/, 'backend responses do not include display labels');
const agentsDoc = normalize(read('docs/features/agents.md'));
const knowledge = normalize(read('docs/features/knowledge.md'));
const knowledgeAdr = normalize(read('docs/adr/ADR-0010-workspace-only-knowledge.md'));
assert.doesNotMatch(agentsDoc, /Needs Actions|needs_actions|configuration state/, 'agent list has no configuration state');
assert.match(agentsDoc, /Creation progress is not stored/, 'in-progress creation is not persisted');
assert.match(agentsDoc, /actions\?page=1&limit=20/, 'agent create action picker is paginated');
assert.match(agentsDoc, /knowledge\?page=1&limit=20/, 'agent create knowledge picker is paginated');
assert.match(agentsDoc, /assignedActions/, 'agent detail includes assigned actions');
assert.match(agentsDoc, /assignedSources/, 'agent detail includes assigned sources');
assert.match(agentsDoc, /not paginated|without pagination/i, 'agent detail assigned sets are not paginated');
assert.doesNotMatch(agentsDoc, /GET \/workspaces\/{workspace_id}\/agents\/{agent_id}\/(?:actions|knowledge)/, 'assigned sets come from agent detail');
assert.doesNotMatch(agentsDoc, /selectedToolKeys|selectedSourceIds/, 'agent detail does not duplicate selected IDs');
assert.match(api, /Workspace Knowledge is the only source library/, 'workspace knowledge is the only source library');
assert.match(knowledge, /Only .?Ready.? sources from the workspace can be assigned/, 'agent knowledge updates validate workspace source membership and readiness');
assert.match(knowledge, /DUPLICATE_SOURCE/, 'duplicate knowledge content is rejected');
assert.doesNotMatch(knowledge, /reuses that source|without re-ingestion/, 'knowledge sources are not silently reused');
assert.match(api, /DUPLICATE_SOURCE/, 'API documents duplicate knowledge content');
assert.doesNotMatch(knowledge, /GET \/workspaces\/{workspace_id}\/agents\/{agent_id}\/knowledge/, 'assigned sources come from agent detail');
assert.doesNotMatch(knowledge, /available-source list/i, 'the knowledge picker is described as a workspace source list');
assert.match(api, /every newly selected source belongs to the workspace and is ready/, 'API validates newly selected workspace sources');
assert.match(knowledgeAdr, /belongs to the same workspace and is ready/, 'ADR records workspace source validation');
assert.match(knowledge, /source and assignments remain/, 'source delete keeps state when vector purge fails');
assert.match(aiContract, /before deleting local source metadata/, 'AI contract purges before local source deletion');
assert.doesNotMatch(knowledge, /agents\/\{agent_id\}\/knowledge-sources/, 'knowledge ingestion has no agent-specific route');
assert.match(actions, /assignment workflows do not edit approval flags/, 'action approval is policy-driven');
assert.doesNotMatch(designCommand, /channel_key/, 'design guidance uses channel_id and channel_type');
assert.match(designCommand, /numeric `channel_id`/, 'design guidance defines channel identity');
const channels = normalize(read('docs/features/channels.md'));
assert.match(channels, /multiple channel instances/i, 'workspaces may create multiple channel instances per type');
assert.match(channels, /at most one assigned agent/i, 'each channel has at most one assigned agent');
assert.match(channels, /frontend owns the channel type catalog/i, 'frontend owns channel type display text');
assert.match(channels, /channel_type/, 'channel instances include a channel type');
assert.match(channels, /channels\/\{channel_id\}/, 'channel editing uses numeric channel IDs');
assert.doesNotMatch(channels, /channel_key/, 'channel identities use channel_id');
assert.doesNotMatch(channels, /channels\/types/, 'channel type discovery endpoint is removed');
assert.doesNotMatch(channels, /CHANNEL_DISABLED/, 'channel types have no disabled state');
assert.match(channels, /agents\?page=1&limit=20/, 'channel create agent picker is paginated');
assert.doesNotMatch(channels, /Unconfigured types show/i, 'unconfigured types are limited to the create picker');
assert.match(channels, /not fully designed|incomplete/i, 'incomplete transport and conversation behavior is explicit');
assert.doesNotMatch(api, /custom action CRUD/i, 'custom action CRUD is deferred');
assert.doesNotMatch(api, /\/agents\/\{agent_id\}\/channels/, 'agent channel endpoints must be removed');
assert.match(api, /integrations\/\{integration_key\}/, 'integrations use stable keys');
assert.doesNotMatch(api, /integrations\/\{integration_id\}/, 'numeric integration paths are removed');
assert.match(api, /oauth\/start/, 'API outline includes OAuth start');
assert.match(api, /integrations\/oauth\/callback/, 'API outline includes the OAuth callback');
assert.doesNotMatch(api, /oauth\/complete|PENDING_EXPIRED|oauth_pending_connection/, 'pending OAuth flows are removed');
assert.match(api, /actions\/\{tool_key\}/, 'actions use stable tool keys');
assert.match(api, /actions\/\{tool_key\}\/availability/, 'API outline includes workspace action availability');
assert.match(api, /ACTION_UNAVAILABLE/, 'API outline includes unavailable action updates');
assert.doesNotMatch(api, /actions\/\{action_id\}/, 'numeric action paths are removed');

const authEndpoints = [
  'POST /api/v1/auth/sign-up',
  'POST /api/v1/auth/verify-email',
  'POST /api/v1/auth/resend-verification',
  'POST /api/v1/auth/sign-in',
  'POST /api/v1/auth/refresh',
  'POST /api/v1/auth/sign-out',
  'GET /api/v1/auth/me',
  'POST /api/v1/auth/password-reset/request',
  'POST /api/v1/auth/password-reset/verify',
  'POST /api/v1/auth/password-reset/confirm',
];
assert.match(auth, /^## 1\. Workflows$/m, 'auth page documents workflows');
assert.match(auth, /^## 2\. Session states$/m, 'auth page documents session states');
assert.match(auth, /^## 3\. Future work$/m, 'auth page documents future work');
assert.match(auth, /^## 4\. Decisions$/m, 'auth page documents decisions');
assert.equal((auth.match(/^### /gm) || []).length, 9, 'auth page documents nine workflows');
assert.match(auth, /stateDiagram-v2/, 'auth page includes a session state diagram');
for (const endpoint of authEndpoints) {
  assert.ok(auth.includes(endpoint), `auth page includes ${endpoint}`);
  assert.ok(api.includes(endpoint), `API outline includes ${endpoint}`);
}
for (const error of [
  '401 INVALID_CREDENTIALS',
  '403 EMAIL_NOT_VERIFIED',
  '401 SESSION_EXPIRED',
  '404 NOT_FOUND',
  '409 EMAIL_ALREADY_EXISTS',
  '409 EMAIL_ALREADY_VERIFIED',
  '422 INVALID_VERIFICATION_CODE',
  '422 VERIFICATION_CODE_EXPIRED',
  '422 INVALID_RESET_CODE',
  '422 RESET_CODE_EXPIRED',
  '422 VALIDATION_ERROR',
  '429 RATE_LIMITED',
]) {
  assert.ok(auth.includes(error), `auth page documents ${error}`);
}
assert.match(auth, /Argon2id/, 'auth page documents Argon2id password hashing');
assert.match(auth, /HMAC-SHA-256/, 'auth page documents hashed codes');
assert.match(auth, /10-minute expiry/, 'auth page documents code expiry');
assert.match(auth, /5 attempts/, 'auth page documents code attempts');
assert.match(auth, /rate-limited per client IP/, 'auth page documents route rate limiting');
assert.match(auth, /single-use/, 'auth codes are single-use');
assert.match(auth, /12 characters|12-character/, 'passwords have a minimum length');
assert.match(auth, /30-day absolute lifetime/, 'refresh sessions have an absolute lifetime');
assert.match(auth, /grace window/, 'concurrent refresh rotation notes a grace window');
assert.match(auth, /existing unverified email/, 'sign-up prevents unverified pre-hijacking');
assert.match(auth, /opaque `<session_id>\.<secret>` value/, 'auth page documents the refresh-token session identifier');
assert.match(auth, /Resend requests are rate-limited per client IP/, 'auth resend rate limiting is documented');
assert.match(auth, /404 NOT_FOUND/, 'auth page records the not-found boundary');
assert.match(api, /EMAIL_NOT_VERIFIED/, 'API outline documents unverified-email sign-in');
assert.match(api, /EMAIL_ALREADY_EXISTS/, 'API outline documents existing-email sign-up conflict');
assert.match(api, /SESSION_EXPIRED/, 'API outline documents expired sessions');
assert.match(api, /HttpOnly/, 'API outline documents the refresh cookie');
assert.match(api, /grace window/, 'API outline documents concurrent refresh grace');
assert.match(api, /non-members receive `404 NOT_FOUND`/, 'API outline records the non-member workspace boundary');
assert.match(api, /rate-limited per client IP/i, 'API outline records auth rate limiting');
assert.match(api, /Workspace routes require a user access token/, 'API outline separates user identity from workspace access');
assert.match(api, /empty `202`/, 'API outline allows empty 202 auth responses');
assert.match(api, /resource-specific 401\/403 codes/, 'API outline allows auth-specific 401 and 403 codes');
assert.match(architecture, /\[Authentication\]\(features\/auth\.md\)/, 'architecture links the auth page');

assert.match(aiContract, /"agent_config": \{/, 'AI contract must send agent_config');
assert.match(aiContract, /"requires_approval"/, 'AI contract tools must carry approval flags');
assert.match(aiContract, /"approval_id": "550e8400/, 'AI contract must use an AI-generated approval UUID');
assert.match(aiContract, /POST \/webhooks\/ai/, 'AI contract must send webhooks');
assert.match(aiContract, /"knowledge_source_ids"/, 'AI contract sends selected workspace source IDs');
assert.match(aiContract, /"channel_id":/, 'AI contract identifies the channel instance');
assert.match(aiContract, /"channel_type":/, 'AI contract identifies the channel type');
assert.match(aiContract, /resolved by the Backend from workspace policy/, 'approval flags are policy-driven');
assert.match(aiContract, /409 DUPLICATE_SOURCE/, 'AI contract rejects duplicate knowledge content');
assert.doesNotMatch(aiContract, /reuses the source|without re-ingestion/, 'AI contract does not reuse duplicate knowledge');
assert.doesNotMatch(aiContract, /agents\/\{agent_id\}\/knowledge-sources/, 'knowledge ingestion is workspace-scoped');
assert.doesNotMatch(aiContract, /MCP/, 'AI contract must not describe MCP');

assert.match(api, /openapi\.client\.yaml/, 'API outline names the client OpenAPI target');
assert.match(api, /openapi\.internal\.yaml/, 'API outline names the internal OpenAPI target');

const databaseDoc = normalize(read('docs/database/database.md'));
assert.match(databaseDoc, /## Relationships/, 'database design documents relationships');
assert.match(databaseDoc, /workspaces_channels/, 'database design documents channel relationships');
assert.match(databaseDoc, /agents_knowledge_sources/, 'database design documents agent knowledge assignments');
assert.match(databaseDoc, /workspaces_integrations/, 'database design documents integration connections');

const schema = normalize(read('docs/database/schema.dbml'));
assert.match(schema, /Table workspaces_channels \{[\s\S]*?id int \[pk, increment\]/, 'channel instances use numeric IDs');
assert.match(schema, /channel_type channel_type \[not null\]/, 'channel instances include a channel type');
assert.doesNotMatch(schema, /\(workspace_id, channel_type\) \[unique/, 'a workspace may have multiple channel instances per type');
assert.match(schema, /name varchar\(100\) \[not null\]/, 'channel instances have workspace-specific names');
assert.match(schema, /\(workspace_id, name\) \[unique/, 'channel instance names are unique per workspace');
assert.match(schema, /agent_id int \/\/ single agent per channel/, 'a channel has at most one agent');
assert.doesNotMatch(schema, /is_active/, 'workspace channels have no active toggle');
assert.doesNotMatch(schema, /display_name varchar\(50\)/, 'channel display metadata belongs in code');
assert.match(schema, /Enum channel_type \{\n  whatsapp\n  widget\n  hosted\n\}/, 'channel types match the supported set');
assert.doesNotMatch(schema, /channel_key/, 'channel identities use channel_id');
assert.match(schema, /Table conversations \{[\s\S]*?channel_id int \[not null\]/, 'conversations belong to a channel instance');
assert.match(schema, /Ref: conversations\.channel_id > workspaces_channels\.id/, 'conversations reference channel IDs');
assert.doesNotMatch(schema, /Table agents_channels \{/, 'agent channel join table must be removed');
assert.doesNotMatch(schema, /Table integrations \{/, 'integration definitions belong in code');
assert.doesNotMatch(schema, /Table actions \{/, 'action definitions belong in code');
assert.doesNotMatch(schema, /Table catalog_state \{/, 'catalog version comes from the code registry');
assert.match(schema, /integration_key varchar\(50\)/, 'workspace connections use stable integration keys');
assert.match(schema, /tool_key varchar\(100\) \[not null\] \/\/ stable built-in tool key/, 'agent grants and executions use tool keys');
assert.doesNotMatch(schema, /action_id int/, 'numeric action references are removed');
assert.match(schema, /Table workspace_action_settings \{/, 'workspace action settings must be durable');
assert.match(schema, /enabled bool \[not null, default: true\]/, 'workspace action settings store the user override');
assert.doesNotMatch(schema, /availability.*varchar/, 'workspace action availability is derived, not stored');
assert.match(schema, /Table oauth_states \{/, 'OAuth state records must be durable');
assert.match(schema, /state_hash varchar\(64\) \[pk\]/, 'OAuth state is stored as a hash');
assert.doesNotMatch(schema, /oauth_pending_connections/, 'pending OAuth flows are removed');
assert.match(schema, /external_account_id varchar\(255\)/, 'connections store external account IDs');
assert.match(schema, /token_expires_at datetime/, 'connections store token expiry');
assert.match(schema, /granted_scopes varchar\(1000\)/, 'connections store granted scopes');
assert.doesNotMatch(schema, /custom_action_configs/, 'custom action tables are deferred');
assert.doesNotMatch(schema, /action_type/, 'custom action discriminator is deferred');
assert.match(schema, /Table approvals \{/, 'approvals table must exist');
assert.match(schema, /id varchar\(36\) \[pk\]/, 'approval IDs are UUIDs');
assert.doesNotMatch(schema, /params_hash/, 'approval params are not hashed');
assert.match(schema, /effect_summary varchar\(1000\)/, 'approvals store an effect summary');
assert.doesNotMatch(schema, /executions\.approval_id/, 'executions are not linked to approvals');
assert.match(schema, /tool_key varchar\(100\)/, 'executions store a tool key');
assert.doesNotMatch(schema, />\?/, 'DBML relationship operators are valid');
for (const table of [
  'agents',
  'workspace_action_settings',
  'workspaces_integrations',
  'oauth_states',
  'workspaces_channels',
  'conversations',
  'executions',
  'approvals',
  'knowledge_sources',
]) {
  assert.match(
    schema,
    new RegExp(`Ref: ${table}\\.workspace_id > workspaces\\.id \\[delete: cascade\\]`),
    `${table} cascades on workspace deletion`,
  );
}
assert.match(schema, /integration_key varchar\(50\)/, 'executions store an integration key');
assert.doesNotMatch(schema, /side_effect side_effect_class/, 'catalog metadata lives in code');
assert.match(schema, /content_hash varchar\(64\)/, 'knowledge sources store a content hash');
assert.match(schema, /Table knowledge_sources \{/, 'workspace knowledge sources table must exist');
const knowledgeTable = schema.match(/Table knowledge_sources \{[\s\S]*?\n\}/);
assert.ok(knowledgeTable, 'workspace knowledge sources table must be complete');
assert.doesNotMatch(knowledgeTable[0], /content text/, 'knowledge sources have no snippet content column');
assert.match(schema, /\(workspace_id, content_hash\) \[unique/, 'knowledge dedupe is workspace-scoped');
assert.match(schema, /Table agents_knowledge_sources \{/, 'agents select workspace knowledge through a join table');
assert.match(schema, /\(agent_id, source_id\) \[pk\]/, 'agent knowledge assignments are unique per source');
assert.doesNotMatch(schema, /scope_type|scope_key|knowledge_source_links/, 'agent-specific knowledge scope columns are removed');
assert.match(schema, /retryable bool/, 'failed executions can replay the retryable flag');
assert.match(schema, /Enum knowledge_status \{\n  processing\n  ready\n  failed\n\}/, 'knowledge statuses match the AI contract');
assert.doesNotMatch(schema, /ON DELETE/, 'schema.dbml must use Ref delete settings instead of ON DELETE comments');
assert.equal((schema.match(/\{/g) || []).length, (schema.match(/\}/g) || []).length, 'schema.dbml: unbalanced braces');

const tableBlock = (name) => {
  const match = schema.match(new RegExp(`Table ${name} \\{[\\s\\S]*?\\n\\}`));
  assert.ok(match, `${name} table must exist`);
  return match[0];
};
const usersTable = tableBlock('users');
assert.match(usersTable, /is_verified boolean \[not null, default: false\]/, 'users track non-null verification state');
assert.match(usersTable, /updated_at datetime \[default: `now\(\)`\]/, 'users track updates');
const sessionsTable = tableBlock('sessions');
assert.match(sessionsTable, /refresh_token_hash varchar\(64\) \[unique, not null\]/, 'refresh tokens are stored as unique hashes');
assert.match(sessionsTable, /expires_at datetime \[not null\]/, 'sessions expire');
assert.match(sessionsTable, /revoked_at datetime/, 'sessions can be revoked');
const authCodesTable = tableBlock('auth_codes');
assert.match(authCodesTable, /code_hash varchar\(64\) \[not null\]/, 'auth codes are stored as hashes');
assert.match(authCodesTable, /attempts int \[not null, default: 0\]/, 'auth codes are attempt-limited');
assert.match(authCodesTable, /consumed_at datetime/, 'auth codes are single-use');
assert.match(schema, /Enum auth_code_purpose \{\n  email_verification\n  password_reset\n\}/, 'auth code purposes use an enum');
assert.match(schema, /Ref: sessions\.user_id > users\.id \[delete: cascade\]/, 'sessions cascade on user deletion');
assert.match(schema, /Ref: auth_codes\.user_id > users\.id \[delete: cascade\]/, 'auth codes cascade on user deletion');
assert.doesNotMatch(schema, /Table\s+"?workspace_members"?\s*\{/, 'workspace membership is not modeled');
assert.match(databaseDoc, /Refresh tokens and auth codes are stored as hashes/, 'database design documents hashed auth tokens');
assert.match(databaseDoc, /`sessions`, `auth_codes`/, 'database design names the auth tables');
assert.match(databaseDoc, /password reset revokes all user sessions/i, 'database design documents reset revocation');
assert.match(databaseDoc, /Email is normalized to lowercase/, 'database design documents email normalization');

// Deleted meta-docs must not be referenced anywhere outside the historical work records.
const stale = /agent-metadata\.md|agent-routing\.md|agent-onboarding\.md|agent-workflow\.md|docs\/onboarding|\.opencode\/README/;
const sweep = ['AGENTS.md', 'CLAUDE.md', 'README.md', 'api/README.md', 'opencode.json',
  ...['docs', '.agents', '.opencode', '.claude', '.cursor', '.github'].flatMap(files)]
  .filter((file) => !historical(file) && !file.startsWith(privateRoot) && /\.(?:md|mdc|mjs|json|ya?ml)$/.test(file));
for (const file of sweep) assert.doesNotMatch(read(file), stale, `${file}: references a deleted meta-doc`);

console.log('Backend documentation consistency passed.');
NODE

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
const files = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const file = path.join(dir, entry.name);
  return entry.isDirectory() ? files(file) : [file];
});

const docsRoot = 'docs';
const privateRoot = path.join('docs', 'private');
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
  'docs/features/agents-config.md',
  'docs/features/approvals.md',
  'docs/features/channels.md',
];

for (const file of docs) {
  const text = normalize(read(file));
  for (const [index, line] of text.split('\n').entries()) {
    assert.equal(/[ \t]+$/.test(line), false, `${file}:${index + 1}: trailing whitespace`);
  }
  assert.equal((text.match(/```/g) || []).length % 2, 0, `${file}: unbalanced code fences`);
  for (const match of text.matchAll(/^```mermaid\n([\s\S]*?)^```$/gm)) {
    const first = match[1].trim().split('\n')[0];
    assert.match(first, /^(?:stateDiagram-v2|sequenceDiagram|flowchart(?: LR| TD| RL| BT)?)$/, `${file}: invalid Mermaid diagram ${first}`);
  }
  for (const match of text.matchAll(/\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    const target = match[1];
    if (/^(?:[a-z][a-z\d+.-]*:|#)/i.test(target) || /[<>[\]]/.test(target)) continue;
    const local = decodeURIComponent(target.split('#')[0]);
    assert.ok(existsSync(path.resolve(path.dirname(file), local)), `${file}: missing local link ${target}`);
  }
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
const aiContractPath = 'docs/ai-service-integration/ai-service-contract-v3.md';
const actionsPath = 'docs/features/actions.md';
const api = normalize(read(apiPath));
const aiContract = normalize(read(aiContractPath));
const actions = normalize(read(actionsPath));

const integrations = normalize(read('docs/features/integrations.md'));

assert.match(integrations, /oauth\/start/, 'integrations start OAuth from the Backend');
assert.match(integrations, /integrations\/oauth\/callback/, 'the Backend receives the OAuth callback');
assert.match(integrations, /oauth\/complete/, 'multi-account OAuth selection completes in the Backend');
assert.match(integrations, /OAuth provider profile/, 'providers share a reusable OAuth profile');
assert.match(integrations, /frontend localizes integration names/i, 'frontend owns integration display text');
assert.doesNotMatch(integrations, /provider API key/, 'integration connection uses OAuth, not API keys');
assert.match(actions, /Custom HTTP actions/, 'custom actions must remain in future work');
assert.doesNotMatch(actions, /^### .*custom action/m, 'custom action workflows are deferred');
assert.match(actions, /code registry/, 'built-in action definitions live in code');
assert.match(actions, /LLM-facing action description/i, 'action descriptions are LLM-facing');
assert.match(actions, /frontend renders localized action names/i, 'frontend owns action display text');
assert.match(actions, /Set workspace action availability/, 'workspace action availability has a workflow');
assert.match(actions, /ACTION_UNAVAILABLE/, 'unavailable enable attempts use a stable error');
assert.match(actions, /stateDiagram-v2/, 'workspace action availability has a state diagram');
assert.match(actions, /No row means enabled by default/, 'workspace action settings are sparse');
assert.match(actions, /preserves stored grants for disabled or unavailable actions/, 'disabled grants are preserved');
assert.match(actions, /Invalid credentials do not delete settings or agent grants/, 'invalid credentials preserve action state');
assert.match(actions, /Explicit disconnect removes workspace action settings and agent grants/, 'disconnect cleanup is explicit');
assert.doesNotMatch(actions, /actions\/\{action_id\}/, 'action detail uses a stable tool key');
assert.match(actions, /actions\/\{tool_key\}/, 'action detail uses a stable tool key');

assert.match(api, /## 3\. Formatting/, 'API outline must define shared formatting');
assert.match(api, /## 4\. Common status codes/, 'API outline must define common errors');
assert.match(api, /404.*NOT_FOUND/s, 'API outline must define not-found handling');
assert.match(api, /tools\/call/, 'API outline must include tool execution');
assert.match(api, /channels\/\{channel_id\}/, 'API outline must include channel instance editing');
assert.match(api, /channels\/types/, 'API outline must include channel type discovery');
assert.doesNotMatch(api, /channels\/\{channel_key\}/, 'channel routes must use instance IDs');
assert.match(api, /OpenAPI generation notes/, 'API outline must include OpenAPI generation guidance');
assert.match(api, /Basic information → Assign Actions → Configure Knowledge → Review & save/, 'agent creation has four steps');
assert.match(api, /Creation fields: name and instructions/, 'agent creation matches the Basic information form');
assert.match(api, /Frontend localization owns static labels, descriptions, and category labels/, 'frontend owns static display text');
assert.doesNotMatch(api, /displayName/, 'backend responses do not include display labels');
const agentsDoc = normalize(read('docs/features/agents-config.md'));
const knowledge = normalize(read('docs/features/knowledge.md'));
const knowledgeAdr = normalize(read('docs/adr/ADR-0010-workspace-only-knowledge.md'));
assert.doesNotMatch(agentsDoc, /Needs Actions|needs_actions|configuration state/, 'agent list has no configuration state');
assert.match(agentsDoc, /Creation progress is not stored/, 'in-progress creation is not persisted');
assert.match(api, /Workspace Knowledge is the only source library/, 'workspace knowledge is the only source library');
assert.match(agentsDoc, /Agents cannot create knowledge sources/, 'agents select workspace knowledge only');
assert.match(agentsDoc, /Every selected source must belong to the workspace and be ready/, 'agent creation validates workspace source membership and readiness');
assert.match(knowledge, /every selected source belongs to this workspace and is ready/, 'agent knowledge updates validate workspace source membership and readiness');
assert.match(api, /every source belongs to the workspace and is ready/, 'API validates selected workspace sources');
assert.match(knowledgeAdr, /belongs to the same workspace and is ready/, 'ADR records workspace source validation');
assert.match(knowledge, /source and assignments remain/, 'source delete keeps state when vector purge fails');
assert.match(aiContract, /before deleting local source metadata/, 'AI contract purges before local source deletion');
assert.doesNotMatch(knowledge, /agents\/\{agent_id\}\/knowledge-sources/, 'knowledge ingestion has no agent-specific route');
assert.match(actions, /picker does not edit approval flags/, 'action approval is policy-driven');
const channels = normalize(read('docs/features/channels.md'));
assert.match(channels, /multiple channel instances/i, 'workspaces may create multiple channel instances per type');
assert.match(channels, /at most one operating agent/i, 'each channel has at most one operating agent');
assert.match(channels, /Frontend localization provides type labels/i, 'frontend owns channel type display text');
assert.match(channels, /not complete/i, 'incomplete transport and conversation behavior is explicit');
assert.doesNotMatch(api, /custom action CRUD/i, 'custom action CRUD is deferred');
assert.doesNotMatch(api, /\/agents\/\{agent_id\}\/channels/, 'agent channel endpoints must be removed');
assert.match(api, /integrations\/\{integration_key\}/, 'integrations use stable keys');
assert.doesNotMatch(api, /integrations\/\{integration_id\}/, 'numeric integration paths are removed');
assert.match(api, /oauth\/start/, 'API outline includes OAuth start');
assert.match(api, /integrations\/oauth\/callback/, 'API outline includes the OAuth callback');
assert.match(api, /oauth\/complete/, 'API outline includes OAuth account completion');
assert.match(api, /PENDING_EXPIRED/, 'API outline includes expired OAuth pending state');
assert.match(api, /actions\/\{tool_key\}/, 'actions use stable tool keys');
assert.match(api, /actions\/\{tool_key\}\/availability/, 'API outline includes workspace action availability');
assert.match(api, /ACTION_UNAVAILABLE/, 'API outline includes unavailable action updates');
assert.doesNotMatch(api, /actions\/\{action_id\}/, 'numeric action paths are removed');

assert.match(aiContract, /"agent_config": \{/, 'AI contract must send agent_config');
assert.match(aiContract, /"requires_approval"/, 'AI contract tools must carry approval flags');
assert.match(aiContract, /"approval_id": "550e8400/, 'AI contract must use an AI-generated approval UUID');
assert.match(aiContract, /POST \/webhooks\/ai/, 'AI contract must send webhooks');
assert.match(aiContract, /"knowledge_source_ids"/, 'AI contract sends selected workspace source IDs');
assert.doesNotMatch(aiContract, /agents\/\{agent_id\}\/knowledge-sources/, 'knowledge ingestion is workspace-scoped');
assert.doesNotMatch(aiContract, /MCP/, 'AI contract must not describe MCP');

assert.match(api, /openapi\.client\.yaml/, 'API outline names the client OpenAPI target');
assert.match(api, /openapi\.internal\.yaml/, 'API outline names the internal OpenAPI target');

const schema = normalize(read('docs/database/schema.dbml'));
assert.match(schema, /Table workspaces_channels \{/, 'workspace channel instances table must exist');
assert.doesNotMatch(schema, /\(workspace_id, channel_key\) \[unique/, 'a workspace may have multiple channel instances per type');
assert.match(schema, /name varchar\(100\) \[not null\]/, 'channel instances have workspace-specific names');
assert.match(schema, /\(workspace_id, name\) \[unique/, 'channel instance names are unique per workspace');
assert.match(schema, /agent_id int \/\/ single agent per channel/, 'a channel has at most one agent');
assert.doesNotMatch(schema, /is_active/, 'workspace channels have no active toggle');
assert.doesNotMatch(schema, /display_name varchar\(50\)/, 'channel display metadata belongs in code');
assert.match(schema, /Enum channel_type \{\n  whatsapp\n  widget\n  hosted\n\}/, 'channel types match the supported set');
assert.match(schema, /channel_id int \[not null\]/, 'conversations belong to a channel instance');
assert.doesNotMatch(schema, /Table agents_channels \{/, 'agent channel join table must be removed');
assert.doesNotMatch(schema, /Table integrations \{/, 'integration definitions belong in code');
assert.doesNotMatch(schema, /Table actions \{/, 'action definitions belong in code');
assert.doesNotMatch(schema, /Table catalog_state \{/, 'catalog version comes from the code registry');
assert.match(schema, /integration_key varchar\(50\)/, 'workspace connections use stable integration keys');
assert.match(schema, /tool_key varchar\(160\) \[not null\] \/\/ stable built-in tool key/, 'agent grants and executions use tool keys');
assert.doesNotMatch(schema, /action_id int/, 'numeric action references are removed');
assert.match(schema, /Table workspace_action_settings \{/, 'workspace action settings must be durable');
assert.match(schema, /enabled bool \[not null, default: true\]/, 'workspace action settings store the user override');
assert.doesNotMatch(schema, /availability.*varchar/, 'workspace action availability is derived, not stored');
assert.match(schema, /Table oauth_states \{/, 'OAuth state records must be durable');
assert.match(schema, /state_hash varchar\(64\) \[pk\]/, 'OAuth state is stored as a hash');
assert.match(schema, /Table oauth_pending_connections \{/, 'OAuth account selection needs pending connections');
assert.match(schema, /external_account_id varchar\(255\)/, 'connections store external account IDs');
assert.match(schema, /token_expires_at datetime/, 'connections store token expiry');
assert.match(schema, /granted_scopes varchar\(1000\)/, 'connections store granted scopes');
assert.doesNotMatch(schema, /custom_action_configs/, 'custom action tables are deferred');
assert.doesNotMatch(schema, /action_type/, 'custom action discriminator is deferred');
assert.match(schema, /Table approvals \{/, 'approvals table must exist');
assert.match(schema, /id varchar\(36\) \[pk\]/, 'approval IDs are UUIDs');
assert.match(schema, /params_hash varchar\(255\)/, 'approvals store a params hash');
assert.match(schema, /effect_summary varchar\(1000\)/, 'approvals store an effect summary');
assert.doesNotMatch(schema, /executions\.approval_id/, 'executions are not linked to approvals');
assert.match(schema, /tool_key varchar\(160\)/, 'executions store a tool key');
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

console.log('Backend documentation consistency passed.');
NODE

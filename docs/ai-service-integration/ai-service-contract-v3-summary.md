# AI Service Integration Contract v3 Summary

> This summary is a navigation aid. The [contract](ai-service-contract-v3.md) is the source of truth. Custom HTTP actions are deferred. The contract still carries user-configured approval flags. The current UI resolves approval requirements from workspace policy, so the approval section needs owner confirmation before revision.

## 1. Architecture & Responsibilities
* **Backend API:** Owns the primary PostgreSQL database, system catalog, `agent_config`, credentials, tool executions (including retries, SSRF checks, and response verification), the approval queue and history, and frontend conversation history.
* **AI Service:** Owns orchestration, RAG retrieval, knowledge ingestion, and its internal Postgres (LangGraph checkpoints, persistent job queues, events, idempotency ledger, read-only catalog copy). It stores no agent configuration.
* **Auth & Routing:** Internal bearer tokens over TLS (`BACKEND_IDENTITY_TOKEN` and `AI_IDENTITY_TOKEN`). Workspace context is embedded directly in URL paths (`/workspaces/{workspace_id}/...` and `/internal/workspaces/{workspace_id}/...`).

---

## 2. Core Workflows

### Incoming Turn & Messaging
1. The Backend saves the user message and calls `POST /workspaces/{workspace_id}/conversations/{conversation_id}/messages` with `agent_id`, `channel`, `content`, `agent_config`, and `Idempotency-Key` → returns `202 { job_id }`.
2. The AI Service loads state from its LangGraph checkpoint, retrieves context from Qdrant (`workspace_id` plus the agent's selected `knowledge_source_ids`), and decides whether to reply or invoke tools.
3. **Delivery:**
   * `message.delta` streams over SSE for streaming-capable channels (omitted for WhatsApp).
   * `message.final` (`text`, `citations[]`) and `job.completed` are delivered via `POST /webhooks/ai` for all channels (and SSE for active streams).
4. **Human Handoff (`mode`):** Once a conversation moves to `human_control` or `closed` via `POST .../mode`, AI involvement ends permanently for that conversation and the Backend stops forwarding messages.

### Tool Execution
* **Endpoint:** AI Service calls `POST /internal/workspaces/{workspace_id}/tools/call` with `idempotencyKey`.
* **Backend Ownership:** Validates the agent, tool, and arguments; checks credentials; executes built-in handlers; retries transient failures up to 3 times with backoff; and verifies provider responses.
* **Idempotency:**
  * *Side-effecting tools:* Deduplicated across `running` (`202`) and terminal states (returns cached result/error).
  * *Read-only tools:* Deduplicated only while `running` (`202`); completed reads always run live.

### Human-in-the-Loop Approvals
1. If a tool has `requires_approval = true`, the AI Service generates a UUID `approval_id`, pauses the checkpoint, and fires the `approval.required` webhook.
2. When a user acts, the Backend checks permissions and calls `POST /workspaces/{workspace_id}/approvals/{approval_id}/decision` with `approved | rejected` and the latest `agent_config` → returns `202 { job_id }`.
3. On approval, the AI Service validates `params_hash`, checks `agent_config.tools`, and verifies compatibility against the latest catalog before calling `tools/call`. It emits `approval.resolved` and sends `message.final` via webhook. On rejection, it skips execution and still sends the final message.

### Knowledge Ingestion
* **Deduplication & Selection:** The Backend hashes URLs (normalized, tracking parameters stripped) and files (SHA-256) to avoid duplicate ingestion within a workspace. `name` and `description` belong to the workspace source. Agents select from the workspace library; assignment does not copy or re-ingest the source.
* **Ingestion Flow:** The Backend generates the DB primary key `source_id` and calls `POST /workspaces/{workspace_id}/knowledge-sources`. The AI Service persists the job to a durable queue before returning `202`, embeds into Qdrant, and reports completion via the `ingestion.status` webhook.
* **Deletion:** A source is purged from Qdrant before its assignments and metadata are removed. A purge failure keeps the source for retry.

---

## 3. Reliability & Sync Principles
* **Initiator-Generated IDs:** The service starting an async flow generates the ID upfront (`approval_id` UUID by AI Service; `source_id` DB PK by Backend) so network retries are safely idempotent.
* **Persistent Queues & Checkpoints:** Turns, approvals, and ingestion jobs are persisted to disk prior to returning `202` to survive restarts and long approval pauses.
* **Catalog Synchronization:** CI/CD pushes updates to `PUT /catalog` on Backend deploy; AI Service pulls via `GET /internal/catalog` on startup or `catalog_version` mismatch. `config_version` is omitted since full `agent_config` is sent per request.

---

## 4. Key Endpoints & Events

| Direction | Endpoint | Purpose |
| :--- | :--- | :--- |
| Backend → AI | `POST /workspaces/{wid}/conversations/{cid}/messages` | Submit user turn (`202`) |
| Backend → AI | `POST /workspaces/{wid}/approvals/{aid}/decision` | Submit approval decision (`202`) |
| Backend → AI | `POST /workspaces/{wid}/knowledge-sources` | Ingest workspace source (`202`) |
| Backend → AI | `GET /workspaces/{wid}/knowledge-sources/{sid}` | Read source status |
| Backend → AI | `POST /workspaces/{wid}/knowledge-sources/{sid}/retry` | Retry ingestion (`202`) |
| Backend → AI | `DELETE /workspaces/{wid}/knowledge-sources/{sid}` | Purge source vectors (`204`) |
| Backend → AI | `POST /workspaces/{wid}/conversations/{cid}/mode` | Set `active`, `human_control`, or `closed` |
| Backend → AI | `GET .../events`, `GET .../trace`, `GET .../jobs/{jid}` | SSE stream, admin trace, job status |
| Backend → AI | `PUT /catalog` | Push global tool catalog |
| AI → Backend | `POST /internal/workspaces/{wid}/tools/call` | Execute tool with idempotency |
| AI → Backend | `GET /internal/catalog` | Pull global tool catalog |
| AI → Backend | `POST /webhooks/ai` | Receive `message.final`, `job.completed`, `approval.required`, `ingestion.status` |

**Active Events:** `plan.created`, `retrieval.completed`, `config.warning`, `approval.required`, `approval.resolved`, `handoff.requested`, `message.delta`, `message.final`, `ingestion.status`, `job.completed`.

---

## 5. Future Work (Post-MVP)
* **Partial Channel Sender Data:** Pass available channel metadata and prompt users for missing info.
* **Approval Expiration (`expires_at`):** Future expiry timestamps, user reminders, and timeout handling.
* **Dynamic Re-Prompting:** Re-prompt users for updated arguments when a tool's schema changes mid-approval.
* **Scheduled URL Re-Ingestion:** Periodic re-crawling of website knowledge sources.
* **Deferred Events:** `tool.started`, `tool.completed`, `usage.recorded`, and `error`.
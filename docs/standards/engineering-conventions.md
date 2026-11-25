# Engineering conventions

These are the cross-cutting rules for Backend API and data work. The
[API outline](../api/api-design-outline.md) owns concrete envelopes, status codes, pagination, and
formatting; [schema.dbml](../database/schema.dbml) owns the data model. This page owns rules that
neither states in full and resolves conflicts between them.

Use these conventions when designing, planning, or implementing a Backend change. Do not restate
them in a command, brief, or feature page; link here or to the owning section instead.

## API behavior

- **Idempotent by default.** Use `PUT` for create or replace at a known ID and `POST` only when
  the server assigns the ID.
- **Hard delete by default.** Archive or soft delete needs an explicit decision recorded in the
  owning document or an ADR.
- **Derive, do not store.** Computed values such as action availability are calculated from
  registry membership, connection status, and workspace setting.
- **Do not key collections by ID.** Return arrays of groups that carry their own ID and label.
- **Fixed sets use enums; open labels use strings.** Adding an enum value needs a migration.
- **UTC everywhere.** Use ISO 8601 timestamps in API payloads.

The [API outline](../api/api-design-outline.md) sections 3 and 4 own naming, envelopes, pagination,
status codes, and error details. Follow them rather than copying them.

## Data naming and types

- Plural table names; link tables join two plural entities.
- `id int [pk, increment]`; foreign keys use `<entity>_id`; stable slugs use `*_key`.
- Enums use `<domain>_<property>` with lowercase `snake_case` values, except HTTP method values
  such as `GET`.
- Add `created_at` where creation time matters and `updated_at` on editable rows.
- Entity state uses `is_*` (for example, `is_verified`). Use `varchar(n)` for bounded text, `text`
  for long content, and `varchar(2048)` for URLs.
- Hard deletes cascade through foreign keys. For workspace knowledge, request vector purge before
  deleting the source. A failed purge keeps the source and assignments for retry; a successful
  purge removes the source, assignments, metadata, and private object.
- Internal services get distinct sub-resources when they need a different representation.

[schema.dbml](../database/schema.dbml) owns the tables, columns, enums, and relationships.

## Security and credentials

- Encrypt secrets at rest; never store credentials in plaintext.
- Provider credentials never leave the Backend. Tokens never appear in frontend URLs, browser
  storage, or logs.
- Hash passwords with Argon2id; never store or log plaintext credentials.
- Keep access tokens short-lived; store refresh tokens and auth codes as hashes; rotate refresh
  tokens; revoke sessions on sign-out and password reset.
- Use generic responses for sign-up, password reset, and resend to avoid enumeration; rate-limit
  these flows.
- Workspace resources for non-members return `404 NOT_FOUND`; `403 FORBIDDEN` is for role
  restrictions when membership is modeled.
- The AI Service calls the Backend API; it does not write PostgreSQL directly.

The [authentication design](../features/auth.md) owns the auth workflows and token rules. The
[architecture](../architecture.md) and
[AI Service contract](../ai-service-integration/ai-service-contract.md) own the service
boundaries.

## Localization

The frontend owns static labels, descriptions, and category labels for integrations, actions, and
channel types. The Backend sends stable keys and user-owned text only. LLM-facing action
descriptions are not used for display. Unknown keys fall back to the key plus an update-required
state, without hiding rows or removing existing grants.

See the [API outline](../api/api-design-outline.md) for the response rules.

## Documentation

Feature pages, API references, and schema changes follow the
[documentation conventions](document-conventions.md). Record durable decisions in
[docs/adr](../adr/README.md).

## Maintenance

When a rule changes, update the owning document first, then any command that points to it. Do not
add a second copy to a command or work brief.

# FelOps Backend documentation

This directory is the source of truth for the Backend API, data model, and product workflows. Current runtime scope is tracked in [project-context.md](project-context.md) (`health`, `auth`, and owner-scoped `workspaces` are implemented; other workflows remain planned).

## Start here

| Topic | Document |
| --- | --- |
| Product intent and constraints | [project-context.md](project-context.md) |
| System architecture | [architecture.md](architecture.md) |
| API organization and conventions | [api/api-design-outline.md](api/api-design-outline.md) |
| Database schema | [database/schema.dbml](database/schema.dbml) |
| Database overview | [database/database.md](database/database.md) |
| Product workflows | [features/](features/) |
| AI Service boundary | [ai-service-integration/ai-service-contract.md](ai-service-integration/ai-service-contract.md) |
| Engineering rules | [standards/engineering-conventions.md](standards/engineering-conventions.md) |
| Express 5 API conventions | [standards/express-conventions.md](standards/express-conventions.md) |
| AI engineering rules | [standards/ai-engineering-rules.md](standards/ai-engineering-rules.md) |
| Durable decisions | [adr/README.md](adr/README.md) |
| Work records | [work/README.md](work/README.md) |
| Contributor and coding-agent rules | [../AGENTS.md](../AGENTS.md) |
| Delivery sequence | [delivery.md](delivery.md) |

## Directory map

```text
docs/
  README.md
  architecture.md
  project-context.md
  delivery.md               Design → Implementation → Deployment sequence
  api/                      API outline and generated OpenAPI targets
  database/                 Database overview and DBML schema
    database.md             Database overview and change guidance
    schema.dbml             Canonical planned schema
  features/                 Feature and workflow design
  ai-service-integration/   Protected AI Service contract and summary
  standards/                Engineering, documentation, Express, and AI engineering rules
  adr/                      Architecture decision records
  templates/                Brief, plan, and ADR templates
  work/                     Per-task briefs, plans, and evidence
  private/                  Local-only material, ignored by Git
```

## API specifications

`api/api-design-outline.md` holds the API organization, shared formatting, and common errors. Low-level OpenAPI specs are generated from Zod 4 schemas via `npm run openapi:generate --prefix api` (never hand-edited):

- `api/openapi.client.yaml` (generated for implemented client routes; imported into Apidog)
- `api/openapi.internal.yaml` (placeholder until internal/AI-webhook routes are implemented)

## Documentation rules

Feature pages follow [standards/document-conventions.md](standards/document-conventions.md). Cross-cutting API, data, security, and delivery rules live in [standards/engineering-conventions.md](standards/engineering-conventions.md). Durable architecture decisions belong in [adr/](adr/); task evidence belongs in [work/](work/).

Run `bash bin/check-backend-docs.sh` after changing these docs. For setup and application commands, see the [repository README](../README.md).

# FelOps Backend

FelOps is being built to let businesses configure workspace agents, connect
their tools, and serve customers across channels. The planned AI Service chooses
actions; the Backend stores the rules and the MCP Server enforces them.

This repository currently implements an Express API scaffold with
`GET /api/v1/health`, runtime configuration, and a users schema. Product flows
in the design documents are planned. `mcp-server/` is a placeholder; AI Service
implementation lives in the separate `FelOps-platform/felops-ai` repository.

## Documentation

| Start here | Purpose |
| --- | --- |
| [Architecture](api/docs/architecture.md) | Current system design, components, and flows |
| [Database](api/docs/database.md) | Current proposed schema, relationships, and open questions |
| [Team workflow](api/docs/workflow.md) | Design → Implementation → Deployment and how designs are maintained |
| [Sprint 1](api/docs/sprints/sprint-1.md) | Sprint goal, scope, and workflow links |
| [API setup](api/README.md) | Local commands, environment requirements, and Apidog contract handoff |
| [Contributor onboarding](docs/onboarding/agent-onboarding.md) | Where contributors and coding agents start |
| [Coding-agent workflow](docs/onboarding/agent-workflow.md) | Task briefs, implementation, verification, and review |
| [Repository rules](AGENTS.md) | Shared instructions and repository boundaries |
| [Project context](docs/project-context.md) / [verified metadata](agent-metadata.md) | Product intent and evidence of implemented behavior |

Edit architecture and database design in their canonical files above. Sprint,
feature, and `docs/work/` records link to those files and describe the change;
they do not hold separate pieces of the current architecture or schema.

API endpoints and request/response mocks are to be designed in the team's
Apidog workspace after the database revision and workspace invitation. The
retired local OpenAPI/Mintlify site is no longer maintained in this repository.

## Local development

Run from the repository root:

```bash
npm ci --prefix api --ignore-scripts
npm run lint --prefix api
npm run typecheck --prefix api
npm run build --prefix api
bash bin/check-agent-workflow.sh
bash bin/check-opencode-config.sh
```

Server startup and the existing health test require Infisical bootstrap
credentials. Follow [API setup](api/README.md) for the secure environment setup
and test limitations. The root is not an npm workspace.

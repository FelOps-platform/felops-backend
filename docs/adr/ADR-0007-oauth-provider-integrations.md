# ADR-0007: OAuth authorization for provider integrations

Status: Accepted
Date: 2026-11-17
Deciders: FelOps backend team
Area: security, integrations, data

## Context

Workspace integrations need provider authorization without sending long-lived provider secrets through the frontend. The connection must survive access-token expiry and support reconnecting without reconfiguring agents.

## Decision

- Provider connections use the OAuth 2.0 authorization code flow.
- The Backend owns the OAuth client ID, client secret, callback URL, scopes, and token exchange.
- `POST /workspaces/{workspace_id}/integrations/{integration_key}/oauth/start` creates a one-time state value and returns the provider authorization URL.
- Store only a SHA-256 hash of the state, plus workspace, integration, initiator, redirect URI, optional return path, expiry, and consumption time.
- State expires after 10 minutes and is consumed exactly once.
- The provider redirects the browser to `GET /api/v1/integrations/oauth/callback`. The callback route is public, but the state record binds it to the workspace and integration.
- The Backend validates state, exchanges the authorization code with the provider token endpoint, and fetches the connected provider account.
- Tokens never reach the frontend. Encrypt the token set at rest with AES-256-GCM.
- Store the external account ID and name, granted scopes, token expiry, and connection status with the workspace integration.
- Integration code defines the provider authorization endpoint, token endpoint, scopes, account discovery, API base URL, token endpoint authentication, and whether refresh tokens rotate.
- Refresh rotating tokens before execution when the access token is near expiry. Replace the access token and refresh token together under a row lock. If refresh fails, mark the connection `invalid` and require reconnect.
- Disconnecting removes the connection, encrypted tokens, and OAuth states for that workspace integration.
- Provider-specific endpoints and scopes live in the integration code registry, so adding a provider does not change the OAuth flow.

## Consequences

- `workspaces_integrations` stores external account metadata, granted scopes, token expiry, and encrypted OAuth tokens.
- `oauth_states` stores one-time hashed state records.
- Provider client credentials live in runtime configuration, not the database.
- The frontend only receives authorization URLs and redirect status. It never receives access or refresh tokens.
- Token refresh failures and revoked grants surface as `invalid` connection state.

## References

- [Integrations](../features/integrations.md)
- [Architecture](../architecture.md)
- [API outline](../api/api-design-outline.md)
- [Database schema](../database/schema.dbml)
- [ADR-0006](ADR-0006-code-backed-catalogs.md)

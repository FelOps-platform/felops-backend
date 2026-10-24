# Integrations

**Status: Proposed.** These are planned integration workflows, not implemented
backend behavior. The current API implements only `GET /api/v1/health`.

## Workflows

### Connecting to an integration

1. The user opens the integrations page.
2. The frontend requests the integration catalog and each integration's
   workspace status. The proposal includes an ID, name, image URL, status,
   authorization method (OAuth or API key), and type (for example, e-commerce or
   ERP).
3. The user selects an integration. The frontend shows its details and
   available actions.
4. The user authorizes the application:
   - **OAuth:** the frontend redirects to the provider. The provider returns the
     user to the callback URL with an authorization code. The backend validates
     the OAuth state, exchanges the code for an access token and, if provided,
     a refresh token, then stores the connection credentials securely and
     returns the user to the frontend with the authorization result.
   - **API key:** the frontend collects the key, and the backend validates it
     and stores it securely.
5. The backend records the workspace connection. The workflow proposal also
   mentions the user who connected it, but the current proposed schema does not
   define that field; resolve it during the pending database revision.

The credential storage location and how credentials reach the MCP Server remain
open decisions. This workflow does not choose between MCP access to a Credential
Vault and credentials sent with each request; see [Architecture](../architecture.md)
and [Database](../database.md).

### Disconnecting from an integration

1. The user opens the integrations page and views connected integrations.
2. The user selects an integration to disconnect.
3. The frontend sends a disconnect request containing the integration ID.
4. The backend removes or revokes the connection's credential material from the
   chosen secure store and removes the workspace connection record.

The credential storage and lifecycle details remain subject to the credential
design decision. The proposed workspace/integration relationship is in the
canonical [Database](../database.md).

## Failure cases awaiting contract design

The happy paths above are proposals. Define the user-visible errors, retry
behavior, and credential/connection cleanup in the Apidog contract phase:

- **F1 — Connecting, step 4:** cancelled authorization, an invalid OAuth state,
  rejected tokens, or an invalid API key.
- **F2 — Connecting, steps 4–5:** provider timeout or failed local persistence
  after authorization; specify retry and cleanup for partially created
  credentials or connection records.
- **F3 — Disconnecting, step 4:** credential revocation or record removal fails;
  specify what the user sees and which state remains safe to retry.

These cases and the credential-storage decision need design before the
corresponding endpoints are implemented.

## Contract references

Design API endpoints, request/response examples, and mocks in Apidog after the
pending database revision and workspace invitation. No endpoint contract is
defined here; backend implementation follows that design. See
[Product Workflow](../workflow.md) and the proposed setup flow in
[Architecture](../architecture.md).

## Future work

- Creating custom actions.

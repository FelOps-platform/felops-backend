# When to mock

Mock at system boundaries only:

- External services.
- Persistence when a real test store is not practical.
- Time and randomness.
- File system access when it is a boundary of the behavior.

Do not mock your own internal modules or collaborators.

## Designing for mockability

Pass external dependencies into the operation that needs them:

    function loadResource(id, client) {
      return client.get("/resources/" + id);
    }

This keeps the boundary replaceable in tests without coupling behavior to a particular SDK.

Prefer small, specific client methods over a generic function with branching:

    const client = {
      getResource: (id) => fetch("/resources/" + id),
      saveResource: (id, payload) =>
        fetch("/resources/" + id, { method: "PUT", body: JSON.stringify(payload) }),
    };

A narrow interface keeps test setup clear and each mock's result predictable.

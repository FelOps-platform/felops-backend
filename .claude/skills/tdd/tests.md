# Behavior-focused tests

## Good tests

Exercise observable behavior through the public interface. Use a small example that describes what a caller can rely on.

    test("a saved record can be retrieved", async () => {
      const saved = await createRecord({ label: "Example" });
      const result = await getRecord(saved.id);
      expect(result.label).toBe("Example");
    });

Good tests:

- Describe behavior users or callers need.
- Use public interfaces.
- Remain useful through internal refactoring.
- Make one clear assertion about an outcome.

## Tests coupled to implementation

Avoid asserting which internal helper ran or how many times it ran.

    test("createRecord calls the private writer", async () => {
      const writer = jest.spyOn(storage, "write");
      await createRecord({ label: "Example" });
      expect(writer).toHaveBeenCalledTimes(1);
    });

Avoid bypassing the public interface to inspect internal storage. Prefer retrieving the result through the same public contract a caller uses.

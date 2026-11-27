# ADR-0011: Verification password prevents pre-account hijacking

Status: Accepted
Date: 2026-11-27
Deciders: FelOps backend team
Area: security, auth, contracts

## Context

Sign-up creates an unverified account before the email address is proven. An attacker can register a victim's email first with an attacker-controlled password and trigger a verification code to the victim. If verification only consumes the code, the account becomes usable while the attacker's password remains valid. The attacker can then sign in after the victim verifies.

Neither ordering rule fixes this:

- Last-write-wins on repeat sign-up lets an attacker overwrite a victim's pending password.
- First-write-wins leaves an attacker's initial password in place.
- Preventing repeat sign-up does not stop the victim from verifying the attacker's original code.

The account password is only trustworthy if the person proving email ownership also establishes it.

## Decision

- `POST /api/v1/auth/verify-email` requires `{ email, code, password }`.
- Verification sets the supplied password as the authoritative account password in the same transaction that consumes the code, marks the user verified, and creates the session.
- The password submitted at sign-up is provisional and is ignored for existing unverified accounts.
- The frontend retains the sign-up password in memory only and sends it with the verification code. It must not persist it in `localStorage`, `sessionStorage`, cookies, or URLs.
- If the in-memory password is unavailable (reload, another device, expired tab), the user restarts sign-up or uses password reset. No new verification screen is required for the normal path.
- Verification hashes the password before opening the database transaction, so Argon2id does not hold a connection or row lock.

## Consequences

- The verify-email request contract, OpenAPI schema, smoke script, and tests include `password`.
- The verifier's password replaces any password written before verification, closing both attacker-first and victim-first races.
- A frontend that loses the password between screens cannot complete verification without restarting sign-up or resetting the password. This is an accepted UX trade-off to avoid a new UI field.
- Email-first registration remains a stronger future option; it would supersede this decision if adopted.
- Password reset already sets an authoritative password and marks the user verified, so it remains a safe recovery path.

## Alternatives considered

- **Overwrite the password on repeat sign-up:** rejected; last-write-wins still allows an attacker to overwrite a victim's pending password.
- **Keep code-only verification:** rejected; it leaves pre-account hijacking open.
- **Add a password field to the verification screen:** same security, but an avoidable UI change.
- **Email-first pending registration:** stronger and more standard, but a larger schema/API/UI change.

## References

- [Auth workflows](../features/auth.md)
- [API outline](../api/api-design-outline.md)
- [Frontend integration](../development/frontend-integration.md)
- [OWASP WSTG: Email Address Verification](https://wstg.owasp.org/latest/07-Identity_Management/05-Email_Address_Verification/)
- [Microsoft MSRC: Pre-hijacking attacks](https://www.microsoft.com/en-us/msrc/blog/2022/05/pre-hijacking-attacks)

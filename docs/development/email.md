# Email delivery (EmailJS)

The Backend sends verification and password-reset codes through the server-side EmailJS REST API over HTTPS. It does not use SMTP.

This works on Render Free because HTTPS/443 is not blocked.

## Runtime flow

1. The auth service calls the email adapter.
2. The adapter POSTs to `https://api.emailjs.com/api/v1.0/email/send` with:
   - `service_id`
   - `template_id`
   - `user_id` (EmailJS public key)
   - `accessToken` (EmailJS private key)
   - `template_params`
3. EmailJS sends through the email service connected in its dashboard.
4. Non-2xx responses become:
   `503 UPSTREAM_UNAVAILABLE`, `details: [{ service: "email" }]`.

No keys or codes are logged.

## EmailJS setup

1. Create an account at [emailjs.com](https://www.emailjs.com/).
2. Add an email service:
   - **Email Services → Add New Service**
   - Connect Gmail, Outlook, or another provider.
   - Copy the **Service ID**.
3. Create two email templates:

### Verification template

- **To Email:** `{{to_email}}`
- **Subject:** `Verify your FelOps email address`
- **Body:**
  ```text
  Your FelOps verification code is {{code}}.
  It expires in {{expires_in_minutes}} minutes.
  ```

### Password reset template

- **To Email:** `{{to_email}}`
- **Subject:** `Reset your FelOps password`
- **Body:**
  ```text
  Your FelOps password reset code is {{code}}.
  It expires in {{expires_in_minutes}} minutes.
  ```

4. Copy both **Template IDs**.
5. In **Account → General**, copy the **Public Key**.
6. In **Account → Security**:
   - Copy the **Private Key**.
   - Enable **Allow EmailJS API for non-browser applications**.

The backend uses the private key as `accessToken`; the public key alone is not enough for server-side sending.

## Infisical values

Add:

```text
EMAILJS_SERVICE_ID
EMAILJS_PUBLIC_KEY
EMAILJS_PRIVATE_KEY
EMAILJS_TEMPLATE_VERIFICATION_ID
EMAILJS_TEMPLATE_RESET_ID
```

Remove old values:

```text
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REFRESH_TOKEN
EMAIL_WEBHOOK_URL
EMAIL_WEBHOOK_SECRET
EMAIL_FROM
```

Restart or redeploy the API.

## Caveats

- EmailJS limits the REST API to **one request per second**. Normal auth traffic is well below this, but bursts can receive a 429.
- EmailJS is an orchestration layer over your connected email service; plan quotas and provider sending limits still apply.
- Templates are predefined. The Backend can only fill `{{to_email}}`, `{{code}}`, and `{{expires_in_minutes}}` unless you add more parameters.
- Keep the private key server-side. Do not expose EmailJS keys in frontend code.
- For high-volume or custom-domain transactional email, use a dedicated provider such as Resend, Postmark, or SendGrid.

## Smoke test

```bash
npm run smoke:auth --prefix api -- \
  --url https://felops-backend.onrender.com \
  --origin http://localhost:5173 \
  --email smoke+unique@yourdomain.com
```

A `503 UPSTREAM_UNAVAILABLE` with `{ service: "email" }` means EmailJS rejected the request, timed out, or the template/service configuration is wrong. Render logs contain only the EmailJS HTTP status; inspect the EmailJS dashboard or execution logs for details. Response bodies are not logged because they can contain recipient PII.

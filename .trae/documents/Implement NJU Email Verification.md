I will implement SMTP-based email verification restricted to `*.nju.edu.cn` addresses.

### 1. Dependencies & Configuration

* **Install**: `bun add nodemailer` and `bun add -D @types/nodemailer`.

* **Environment**: I will use standard Next.js environment variables for SMTP configuration. I'll add these keys to the usage code:

  * `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

### 2. Backend Implementation

* **Email Service (`lib/email.ts`)**:

  * Create a transporter using `nodemailer`.

  * Implement `sendVerificationEmail(to, code)` to send the code.

* **Verification Store (`lib/auth/store.ts`)**:

  * Implement an in-memory `Map<email, { code, expiresAt }>` with **30-minute** expiration.

* **Domain Validation**:

  * Update `schema/user.ts` to enforce the `/@(.+\.)?nju\.edu\.cn$/` pattern.

* **Server Actions (`app/actions/auth.ts`)**:

  * `sendVerificationCode(email)`:

    1. Validate `email` against the NJU domain regex.
    2. Generate a 6-digit code.
    3. Save to memory store.
    4. Send via SMTP.

  * `signupAction`:

    1. Accept `code` in `FormData`.
    2. Verify the code against the store before creating the user.

### 3. Frontend Implementation

* **Update** **`components/signup-form.tsx`**:

  * Add "Verification Code" input field.

  * Add "Send Code" button with loading state and countdown timer (to prevent spam).

  * Wire up the button to call `sendVerificationCode`.


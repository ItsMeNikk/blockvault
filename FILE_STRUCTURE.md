# BlockVault — File Structure

```
blockvault/
├── app/
│   ├── layout.tsx       Root layout, fonts, page title & meta tags
│   ├── page.tsx         Login page (sign-in, Google OAuth, forgot password)
│   ├── globals.css      Dark theme colors, input styles, animations
│   └── dashboard/
│       └── page.tsx     Vault UI: lock screen, credential list, search, modals
│
├── lib/
│   ├── supabase.ts      Supabase browser client factory
│   └── crypto.ts        SHA-256 password hashing & verification
│
├── eslint.config.mjs    Linting rules (Next.js recommended)
├── next.config.ts       Next.js runtime config
├── postcss.config.mjs   PostCSS + Tailwind v4 setup
├── tsconfig.json        TypeScript config (strict mode, path aliases)
├── package.json         Dependencies & npm scripts
├── .env.local           Supabase credentials (local, never committed)
├── .gitignore           Files git should ignore
└── README.md            Project overview & setup guide
```

---

## Quick Breakdown

**app/** — Every file here = a page or shared resource. Next.js App Router uses the file-system as routing.

**app/layout.tsx** — The HTML shell. Loads fonts, sets the page title ("BlockVault — Secure Digital Vault"). Wraps every page in `<body>`.

**app/page.tsx** — The login screen. Handles email/password auth, Google sign-in via OAuth, forgot password reset flow, and redirect-to-dashboard on success.

**app/globals.css** — Global styles. Defines the dark color palette (`#111110` background, `#F0EDE6` text, `#E8834A` accent). Overrides browser input autofill styles. Sets up the mobile sidebar slide-in animation.

**app/dashboard/page.tsx** — The main vault. Contains everything: lock screen (master password setup/unlock), credential table, search filter, add/edit/delete modals, copy/reveal password actions. All in one file.

**lib/supabase.ts** — Creates the Supabase browser client using `createBrowserClient` from `@supabase/ssr`. This is what connects to your Supabase project.

```
blockvault/
├── app/
│   ├── layout.tsx       Root layout, fonts, page title & meta tags
│   ├── page.tsx         Login page (sign-in, Google OAuth, forgot password)
│   ├── globals.css      Dark theme colors, input styles, animations
│   ├── dashboard/
│   │   └── page.tsx     Vault UI: lock screen, credential list, search, modals
│   └── reset-password/
│       └── page.tsx     Password reset page (after clicking Supabase reset link)
│
├── lib/
│   ├── supabase.ts      Supabase browser client factory
│   └── crypto.ts        SHA-256 hashing & AES-256 encryption/decryption
│
├── eslint.config.mjs    Linting rules (Next.js recommended)
├── next.config.ts       Next.js runtime config
├── postcss.config.mjs   PostCSS + Tailwind v4 setup
├── tsconfig.json        TypeScript config (strict mode, path aliases)
├── package.json         Dependencies & npm scripts
├── .env.local           Supabase credentials (local, never committed)
├── .gitignore           Files git should ignore
├── README.md            Project overview & setup guide
└── FILE_STRUCTURE.md    This file
```

---

## Quick Breakdown

**app/** — Every file here = a page or shared resource. Next.js App Router uses the file-system as routing.

**app/layout.tsx** — The HTML shell. Loads fonts, sets the page title ("BlockVault — Secure Digital Vault"). Wraps every page in `<body>`.

**app/page.tsx** — The login screen. Handles email/password auth, Google sign-in via OAuth, and forgot password via `resetPasswordForEmail` with a redirect to `/reset-password`.

**app/globals.css** — Global styles. Defines the dark color palette (`#111110` background, `#F0EDE6` text, `#E8834A` accent). Overrides browser input autofill styles. Sets up the mobile sidebar slide-in animation.

**app/dashboard/page.tsx** — The main vault. Contains: lock screen (master password setup/unlock), credential table, search, add/edit/delete modals, copy/reveal password actions. On unlock, stores the master password in React state and uses it to encrypt/decrypt all credentials via AES-256 before sending to or reading from Supabase.

**app/reset-password/page.tsx** — Users land here from the Supabase reset email link. Shows a form to set a new master password. Calls `supabase.auth.updateUser({ password })`. On success, redirects to the sign-in page after 2.5 seconds.

**lib/supabase.ts** — Creates the Supabase browser client using `createBrowserClient` from `@supabase/ssr`. Connects to your Supabase project.

**lib/crypto.ts** — Two layers of cryptography:
- **SHA-256 hashing** (`hashPassword`, `verifyPassword`) — used for the master password hash stored in `vault_settings`. Browser-native, no dependencies.
- **AES-256 encryption** (`encryptPassword`, `decryptPassword`) — uses CryptoJS. Encrypts credential passwords before saving to Supabase. Decrypts on load. Master password is the encryption key.

**tsconfig.json** — TypeScript settings. `"strict": true` enables all type safety checks. `@/*` alias maps to the project root.

**.env.local** — Holds `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Added to `.gitignore`, never committed.

**postcss.config.mjs** — Loads the Tailwind v4 PostCSS plugin, which compiles all the utility classes down to plain CSS.

**next.config.ts** — Empty for now. You'd add config here for image domains, rewrites, etc. if needed later.

**eslint.config.mjs** — ESLint rules. Tells the linter to skip `.next/`, `build/`, and `next-env.d.ts` since those are auto-generated.

**tsconfig.json** — TypeScript settings. `"strict": true` enables all type safety checks. `@/*` alias maps to the project root.

**.env.local** — Holds `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Added to `.gitignore`, never committed.

**postcss.config.mjs** — Loads the Tailwind v4 PostCSS plugin, which compiles all the utility classes down to plain CSS.

**next.config.ts** — Empty for now. You'd add runtime config here (image domains, rewrites, etc.) if needed later.

**eslint.config.mjs** — ESLint rules. Tells the linter to skip `.next/`, `build/`, and `next-env.d.ts` since those are auto-generated.
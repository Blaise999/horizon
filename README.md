# Horizon Unified — Next.js + Supabase

The former `horizon-main` and `horizon-backend-main` projects have been consolidated into **one Next.js project**. No Express server, MongoDB service, Redis server, or backend hosting is required. Database reads, authentication, secure ledger operations, approvals, and notifications use **Supabase Auth + Postgres with Row Level Security (RLS)**.

The public marketing landing page has been completely redesigned with a custom interactive product preview, modern responsive navigation, premium visual design, clear product messaging, and direct calls to action. The customer dashboard, login/signup/onboarding, transfers, activity, settings, notifications and admin console have been rebuilt with a consistent responsive interface.

> **Important:** This is **not** a live banking/payments integration. It manages accounts as internal ledger records, with transfer requests and administrative review. ACH, wire, crypto, PayPal and other destinations are request labels only. Admin approval debits the internal ledger; it **does not transmit funds** or issue an actual bank account/card. Do not market this application as a functioning bank or take real deposits without appropriate regulated provider integrations and compliance review.

## 1. Install

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local` with your own Supabase project’s API URL and **publishable/anon key**:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-or-publishable-key
```

The Supabase `service_role`/secret key must **NEVER** be placed in a `NEXT_PUBLIC_` variable or shipped to the browser.

## 2. Set up Supabase

1. Create or select a **Supabase project** and enable Email/Password authentication.
2. Open **Supabase Dashboard → SQL Editor**, and run `supabase/migrations/202611220001_horizon.sql` once. It creates the tables, RLS policies, auth signup trigger, and admin-checked SQL functions.
3. In **Authentication → URL Configuration**, set your **Site URL** and permitted **Redirect URLs** for local development and your deployed domain, including `/dashboard/forgotpassword`.
4. Sign up using the website and confirm the email if email confirmation is enabled.
5. To give your user an admin role, run the following SQL in the **Supabase SQL Editor** (replace the email with a confirmed, trusted account):

   ```sql
   update public.profiles set role = 'admin'
   where email = 'your-confirmed-admin@example.com';
   ```

   Admin access is granted only from the database; normal users cannot change their roles, balances, or transfer approvals through the browser.
6. Start the app:

   ```bash
   npm run dev
   ```

Visit `http://localhost:3000`. Build with `npm run build` after installing dependencies.

## 3. App routes

| Feature | Route |
| --- | --- |
| Public website | `/` |
| Create account | `/create-account` |
| Customer sign in | `/dashboard/loginpage` |
| New user setup | `/dashboard/onboarding` |
| Customer dashboard | `/dashboard/dashboard` |
| Transfer request | `/dashboard/transfers` |
| Account activity | `/dashboard/activity` |
| Notifications | `/notifications` |
| Settings | `/dashboard/settings` |
| Support | `/dashboard/support` |
| Admin console | `/Admin` |

Legacy `/Transfer/...` pages redirect to the single updated transfer request form. The admin login route redirects to the unified Supabase sign-in.

## 4. Database features

| Table | Role |
| --- | --- |
| `profiles` | Auth-linked user information and role |
| `accounts` | Checking/savings internal ledger balances |
| `transfers` | Transfer requests with pending/approved/rejected statuses |
| `transactions` | Posted credits and debits, including adjustments |
| `notifications` | In-app account and transfer notices |
| `admin_audit` | Review, balance adjustment and broadcast audit entries |

**Security model:** RLS restricts access to account owners and authenticated admins. Only database `SECURITY DEFINER` functions may create requests, approve/reject them, post balance adjustments or send mass notices. Functions validate roles and amounts; approvals lock the relevant rows to prevent double-processing and insufficient-funds debits. The public browser key cannot modify balances directly. New accounts start at **$0**.

## 5. Migration limitations

The uploaded backend contained **Mongoose models and controllers, but no MongoDB export**. The SQL migration creates a new schema and backfills existing **Supabase Auth users**, not the historical MongoDB database. Existing MongoDB users, balances, transactions, and transfers are **not automatically migrated**. Before replacing a live deployment, export and reconcile legacy data separately, with special handling for password hashes (users can use Supabase password reset). Do not seed or infer financial balances.

Features of the old backend that do **not** work in a browser-only Supabase architecture without separate trustworthy provider integrations include real transfers, issuing bank/card numbers, OTP-based payment authorization, sending emails/SMS, live cryptocurrency trading, receipt PDF delivery, and full device-binding fraud controls. These have not been represented as functioning integrations.

## 6. Deployment

Deploy the project root to Vercel as **one Next.js app**. Add the same two public Supabase environment variables to Vercel. Do not add `BACKEND_ORIGIN`, `NEXT_PUBLIC_API_URL`, `MONGODB_URI`, or a private Supabase key. Adjust Supabase Auth redirect URL settings for your deployed domain. No backend build or Express service is part of this repo.

## 7. Security warning on original archives

The source ZIPs contained multiple configuration/startup files with an obfuscated script that made outbound requests and tried to execute downloaded JavaScript. **Those files were removed/replaced, never executed during this refactor.** See `docs/SECURITY-NOTICE.md` for details. If these ZIPs were run previously, assume exposed environment variables may need rotating and inspect affected hosts and deployments.

### Verification status

The source was scanned and the new files were syntactically inspected. This execution environment could not reach the npm registry, so `npm install`, `npm run build`, and live Supabase integration tests **could not be completed here**. Validate them on a machine with network access before deployment.

## 8. Landing page refresh (2026-11-22)

The public homepage at `/` is now a **full redesign**, not a cosmetic patch. It is implemented in `src/app/page.tsx` with all homepage-only styling scoped in `src/app/horizon-home.css` so the Supabase customer dashboard is not affected.

- New responsive sticky header with mobile navigation, working signup/login actions and section links.
- Editorial hero headline, tailored navy/mint visual identity, bespoke HTML/CSS finance dashboard illustration (no external images needed), and clear "sample data" labeling.
- New feature bento grid for account overview, transfer requests, activity and access controls.
- Interactive Overview / Transfers / Activity product walkthrough, accessible tabs, FAQs, three-step guide, conversion CTA and new footer.
- Updated marketing metadata and factually accurate disclosures; **no false claims about insured deposits, real bank transfers, live card issuance or guaranteed uptime**.

This update changes the landing page and marketing metadata only; the Supabase schema, customer routes and admin experience are not replaced.

**Validation:** The landing page TSX was parsed via TypeScript without diagnostics and its CSS was parsed via PostCSS. A full Next.js build still requires installing dependencies in an environment with registry access. The prototype remains an internal ledger, not live banking.

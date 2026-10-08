# CRM staging validation

Target: `sdpqphiooiuglywcmkxv` (privilege-imoveis-staging). Never run the SQL suite against production.

## Migration reconciliation

The three 202610070001/2/3 baseline migrations were applied manually and are absent from main and managed history. Existing CRM objects were inspected before any change; no baseline was replayed.

Four corrective migrations were applied through Supabase to staging only. Local filenames match the returned remote versions:

- 20261008144426_crm_security_hardening.sql
- 20261008144813_crm_commercial_relations.sql
- 20261008145320_crm_atomic_media.sql
- 20261008150501_crm_commercial_audit.sql

Do not run `supabase db push` before recovering and comparing the baseline files and reconciling migration history. These corrections do not bootstrap an empty database.

## Verification

- `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- Configure a local ignored .env.local with staging URL and staging publishable/anon key.
- Run `tests/crm-staging-rls.sql` using the Supabase SQL integration with project_id sdpqphiooiuglywcmkxv. The suite creates synthetic fixtures and uses SET LOCAL ROLE authenticated/anon with request.jwt.claims. Final ROLLBACK removes fixtures; sequences may advance.
- `node --env-file=.env.local tests/crm-anon-api.mjs` verifies anonymous REST/RPC boundaries against staging.
- After build, `node tests/crm-http-smoke.mjs` starts an isolated local server and verifies public routes and rejected API input.
- Optional browser checks: `npx playwright install chromium`, start the local staging build on port 3000, then `node tests/crm-browser-smoke.mjs`. Browser execution was blocked here by a truncated Chromium download; it has not passed.
- JSON results record 65 database, 15 anonymous API, and 9 local HTTP assertions.

## Feature entry points

- /admin/crm: assignment, contact, pipeline, follow-up, client, visit, proposal, negotiation, notification, and approval.
- /admin/leads: lead list with confirmed updates and loss reason.
- /apresentacao/[slug]: public presentation restricted to approved, published, non-archived properties with presentation_enabled.
- Property form saves media through crm_save_property_media in one transaction. Requires the staging migrations.

## Deployment

The work branch has automatic Vercel deployments disabled in vercel.json. Do not merge or enable deployment before auditing Vercel environment scope. No production credentials were fetched or used.

Preview remains blocked by Vercel 403 for team_ztWg4IbkQZV5ffEmNfTiXwn2. The fallback CLI has no credentials. Validate the linked repository, production branch, preview env, authentication, and browser flows before deployment.

Storage buckets/policies are absent from staging. Image upload is not validated. Define public marketing images separately from private documents before provisioning Storage.

Client creation is manual; the existing schema does not persist a lead-to-client relationship. Do not claim automatic conversion or a unified visit/proposal timeline. Commercial records now have audit triggers. The CRM list is bounded to 200 leads/clients and 100 records per commercial stage.

# Codex and Work integration - 2026-10-13

## Provenance and boundaries

- Base: Work branch `work/crm-staging-audit-20261008`, commit `6785b6c24be78bc69bc62dc712917e154e25eb72`, existing draft PR #1.
- Source: Codex checkpoint `b0a7e3aa6de98e8ffd9b4b3663ba54d41d819a3e`, code commit `d7780e145d83eb10553ff779218feb35c360022a`.
- Isolated integration branch: `codex/crm-integration-20261013`. Original checkpoint and independent backup verified before fetch and untouched during integration.
- No cherry-pick/whole-branch merge. Changes reviewed by behavior, preserving Work's CrmShell, providers, dashboards, Kanban, Auth/RPC permissions, private Storage, atomic media, marketing and token presentations.
- No migrations, account changes, synthetic SQL fixtures, production deploy or main merge in this execution. Database inspection is read-only staging metadata/history only.

## Incorporated and resolved

| Area | Integration decision |
| --- | --- |
| Public catalog | Shared query applies explicit publish flag, non-archived, approved/published workflow and existing commercial statuses; used by home, catalog, categories, cities, property detail, related properties and sitemap. No permissive legacy fallback. |
| Filters | Commercial code searchable; combined category/location/bedroom/price filtering preserved; "above" price thresholds are exclusive. |
| SEO | Sitemap is request-time dynamic, no longer a build snapshot. Canonicals/routes unchanged. Missing property becomes not-found; query failures are errors, not fake missing properties. JSON-LD serialization escapes opening tags. |
| Broker API | Local payload type/length validation and safe malformed JSON handling integrated into Work's existing token/role/disabled account checks. No replacement authentication service or duplicate API. |
| PropertyForm | Role-aware responsible broker list includes hidden own public profiles; new broker-owned record defaults to authenticated broker. Saved ID retained for retry after media failure, avoiding duplicate creation. Saving remains active through atomic RPC. Missing-column retry narrowed to explicit known legacy fields. |
| Media and approval | Work's private bucket, signed previews, authorization proxy, approval triggers and crm_save_property_media preserved. No legacy delete/insert media sequence or public upload restoration. |
| Presentations/CRM | No Codex /i route, old admin dashboard, tasks/notifications pages, or duplicate CRM endpoints introduced. Work's existing slug/token presentation and agenda/notifications retained. |
| Deployment | Automatic deployment disabled for integration branch. Work's staging-only build guard extended to integration branches, including rejection of production, wrong project/key and service-role. |
| Tests/CI | Local tests adapted to integrated behaviors instead of copying tests for discarded APIs. Typecheck/test scripts added without removing Playwright. Existing smoke suites retained. CI uses synthetic configuration, never production credentials. |
| Historical docs | Old Codex operational instructions were not copied wholesale: they incorrectly instruct baseline replay and describe features now superseded by Work. This report reconciles them with current staging runbooks. |

## Migration reconciliation (read-only)

Eleven managed staging migrations match the eleven SQL files in the Work branch:
20261008144426, 20261008144813, 20261008145320, 20261008150501,
20261008163217, 20261008163432, 20261008163623, 20261009142538,
20261009144156, 20261009174757, 20261013180730.

Recovered manual baselines: 202610070001_crm_foundation,
202610070002_property_operations, 202610070003_lead_followup.
They are in `supabase/historical`, not the CLI migration path. Do not replay them or
repair history automatically. Metadata confirms baseline objects, not identical definitions.
No SQL is missing for the eleven managed versions. Empty-database bootstrap remains separate.

## Validation and remaining work

Results of this execution are recorded below after verification. Prior SQL/RLS results
in Work remain historical evidence, not tests rerun by this integration. Authenticated
admin/manager/broker A/B journeys and upload of real bytes still require staging sessions.
No fake integration or successful login is claimed.

| Verification rerun by this integration | Result |
| --- | --- |
| npm run lint | Passed |
| npm run typecheck | Passed |
| npm test | 9 adapted local tests passed |
| npm run build with staging environment inherited by the process | Passed |
| Existing anonymous commercial API suite | 15/15 |
| Existing marketing API/invalid synthetic login suite | 18/18 |
| Build guards for Work and integration branches | 10/10 |
| Existing local HTTP smoke | 9/9 |
| Browser public/anonymous guard smoke, plus mobile overflow | 19/19 |
| Git diff whitespace check | Passed |
| Recovered SQL Git blobs | All three identical to checkpoint |
| Credential scan of integration changes | No credentials identified; environment untracked |

Existing `tests/*results*.json` files updated by executed suites contain only pass/fail
metadata and synthetic identifiers, not credentials or real contact records. Tests used
only rejected anonymous operations and public reads; no SQL fixtures were inserted.

The first build attempt with Node's --env-file flag hit Next worker option propagation;
loading the staging environment into the parent process before npm run build resolved it.
The first browser attempt reused Linux single-process flags on Windows Edge; the smoke
runner now limits those flags to non-Windows, and the rerun passed. No application code
or Auth logic was bypassed to make tests pass.

Public catalog and workspace still accumulate visible rows for client-side filters.
Server-side pagination/aggregation is a separate performance phase, not solved by this PR.
Supabase schema/private bucket policies and all external connectors are unchanged.

`npm audit` reports 15 findings inherited from the Work lockfile: 1 critical, 12 high,
1 moderate and 1 low, including Next.js. No forced update/downgrade was performed while
reconciling branches. Review dependency upgrades in a dedicated regression-tested PR
before approving a production release. This integration PR remains draft.

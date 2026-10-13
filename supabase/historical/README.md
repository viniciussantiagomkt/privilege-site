# Historical Codex baseline - archive only

These three files were recovered unchanged from checkpoint
`b0a7e3aa6de98e8ffd9b4b3663ba54d41d819a3e`.

They are NOT pending migrations. They are deliberately outside `supabase/migrations`
to avoid accidental replay by the CLI. Do not execute, move into the managed folder,
or repair database migration history as part of this integration.

Staging runbooks report these baselines were installed manually before managed history.
Read-only inspection on 2026-10-13 confirmed the registry, tasks and assignment/contact/
notification functions exist. This does not prove byte-for-byte identity with the archived
SQL: subsequent Work migrations replace functions and policies.

All eleven entries returned by staging migration history have corresponding files in
`supabase/migrations`. No managed SQL file is missing in the Work branch. The three
manual baseline files were the missing source-control artifacts and are recovered here.

An empty database still requires a separately reviewed bootstrap/reconciliation plan.
These snapshots are not a license to run db push or reset against staging or production.
See `docs/crm-codex-integration-20261013.md` for the reconciliation report.

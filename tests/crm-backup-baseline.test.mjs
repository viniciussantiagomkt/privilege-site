import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
const backup = readFileSync(new URL("../scripts/backup-crm-staging.ps1", import.meta.url), "utf8");
const restore = readFileSync(new URL("../scripts/restore-crm-backup-local.ps1", import.meta.url), "utf8");
const fingerprint = readFileSync(new URL("../scripts/crm-backup-schema-fingerprint.sql", import.meta.url), "utf8");

test("catalog comparison avoids identifier truncation and physical-column gaps", () => {
  assert.match(fingerprint, /set search_path = pg_catalog/);
  assert.match(fingerprint, /nspname::text key,nspname::text value/);
  assert.match(fingerprint, /row_number\(\) over \(partition by c\.oid order by a\.attnum\)/);
});

test("backup baseline pins exactly the 22 approved migrations, not just a count", () => {
  const versions = backup.match(/\$expectedMigrationVersions = '([^']+)'/)[1].split(",");
  const actual = readdirSync(new URL("../supabase/migrations", import.meta.url))
    .filter(n => n.endsWith(".sql") && !n.endsWith("_crm_stage03_security_surface.sql"))
    .map(n => n.split("_")[0]).sort();
  assert.equal(versions.length, 22);
  assert.deepEqual(versions, actual);
  assert.match(backup, /source\.migration_versions -ne \$expectedMigrationVersions/);
  assert.match(backup, /source\.security_migration_present/);
});
test("backup remains read-only, staging-only, private and outside the repository", () => {
  assert.match(backup, /default_transaction_read_only=on/);
  assert.match(backup, /PGSSLMODE = 'require'/);
  assert.match(backup, /sdpqphiooiuglywcmkxv/);
  assert.match(backup, /LocalApplicationData/);
  assert.match(backup, /AsSecureString/);
  assert.match(backup, /schema_stable_during_backup/);
});
test("restore requires verified 22-version archive and isolated local container", () => {
  for (const marker of ["migration_count -ne 22", "schema_fingerprint", "--single-transaction", "--exit-on-error", "desktop-linux", "npipe:", "network -ne 'none'", "archive_sha256"])
    assert.ok(restore.includes(marker), marker);
});

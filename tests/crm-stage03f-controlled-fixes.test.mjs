import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (name) =>
  readFileSync(new URL(`../components/crm/${name}.tsx`, import.meta.url), "utf8");

test("legacy contacts use the guarded quick-client editor instead of direct client writes", () => {
  const contacts = source("Contacts");
  const editor = source("ClientEditor");
  assert.match(contacts, /<ClientEditor\b/);
  assert.doesNotMatch(contacts, /\.from\(["']clients["']\)\s*\.(?:insert|upsert|update)\(/);
  assert.match(editor, /supabase\.rpc\(["']crm_save_quick_client["']/);
  assert.match(editor, /expected_revision:\s*revision\.current/);
  assert.match(editor, /possibleClientDuplicates\(/);
});

test("legacy contact creation preserves the owner and mixed-contact choices", () => {
  const contacts = source("Contacts");
  const editor = source("ClientEditor");
  assert.match(contacts, /allowContactTypeOnCreate/);
  assert.match(editor, /allowContactTypeOnCreate\s*&&\s*f\.name\s*===\s*["']contact_type["']/);
  assert.match(editor, /contact_type:\s*text\(f,\s*["']contact_type["']\)/);
});

test("management navigation reuses existing routes without duplicate links", () => {
  const shell = source("Shell");
  assert.match(shell, /n\.href\s*===\s*["']\/admin\/leads["']\s*\?\s*["']Leads e atribuição["']/);
  assert.match(shell, /n\.href\s*===\s*["']\/admin\/equipe["']\s*\?\s*["']Supervisão da equipe["']/);
  assert.doesNotMatch(shell, /title=["']Atribuição de leads institucionais["']/);
});

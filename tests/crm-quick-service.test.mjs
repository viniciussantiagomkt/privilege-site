import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { quickService as q } from "./helpers/load-quick-service.mjs";
import { quickPhoneCases } from "./fixtures/crm-quick-phone-cases.mjs";

for (const { name, input, expected } of quickPhoneCases)
  test(`quick phone regression: ${name}`, () => {
    if (expected === null) assert.throws(() => q.normalizeClientPhone(input));
    else assert.equal(q.normalizeClientPhone(input), expected);
  });
test("DDD55 aliases detect duplicates and produce one canonical WhatsApp recipient", () => {
  const rows = [{ id: 55, phone: "(55) 90000-0000", email: null }];
  for (const phone of [
    "(55) 90000-0000",
    "+55 (55) 90000-0000",
    "0055 (55) 90000-0000",
  ]) {
    assert.deepEqual(
      q.possibleClientDuplicates(rows, { phone }).map((c) => c.id),
      [55],
    );
    const url = new URL(
      q.reviewedWhatsAppUrl(phone, "Mensagem fictícia de teste"),
    );
    assert.equal(url.pathname, "/5555900000000");
    assert.equal(url.searchParams.get("text"), "Mensagem fictícia de teste");
  }
  for (const phone of ["+55 (83) 9000-00", "0055 (83) 9000-00"]) {
    assert.throws(() => q.possibleClientDuplicates(rows, { phone }));
    assert.throws(() => q.reviewedWhatsAppUrl(phone, "Teste"));
  }
});

test("quick phone: normalization is length-aware, including DDD55, without accepting explicit foreign prefix", () => {
  for (const phone of [
    "(83) 90000-0000",
    "+55 83 90000-0000",
    "005583900000000",
  ])
    assert.equal(q.normalizeClientPhone(phone), "5583900000000");
  assert.equal(q.normalizeClientPhone("55900000000"), "5555900000000");
  for (const phone of [
    "123",
    "+1 202 555 0100",
    "(83)abc900000000",
    "0".repeat(100),
  ])
    assert.throws(() => q.normalizeClientPhone(phone));
});
test("duplicates use only the supplied authorized rows, email casing and self exclusion", () => {
  const rows = [
    { id: 1, phone: "(83) 90000-0000", email: "Fixture@Example.invalid" },
    { id: 2, phone: "legacy" },
  ];
  assert.deepEqual(
    q
      .possibleClientDuplicates(rows, { phone: "5583900000000" })
      .map((r) => r.id),
    [1],
  );
  assert.deepEqual(
    q.possibleClientDuplicates(rows, { id: 1, phone: "83900000000" }),
    [],
  );
  assert.deepEqual(
    q
      .possibleClientDuplicates(rows, {
        phone: "83900000001",
        email: "fixture@example.invalid",
      })
      .map((r) => r.id),
    [1],
  );
  assert.deepEqual(
    q.possibleClientDuplicates([], { phone: "83900000000" }),
    [],
  );
});
test("interest profile has exact decimal limits and optional safe fields", () => {
  assert.equal(q.moneyCents("999999999999.99"), BigInt("99999999999999"));
  assert.deepEqual(q.validateInterest({}), {});
  const profile = {
    purpose: "investimento",
    city: "Campina Grande",
    budget_min: "0",
    budget_max: "600000.99",
    bedrooms: 0,
    parking_spaces: 2,
    financing: false,
    neighborhoods: ["Catolé"],
  };
  assert.deepEqual(q.validateInterest(profile), profile);
  for (const bad of [
    { budget_max: 500 },
    { budget_max: "1e9" },
    { budget_min: "900", budget_max: "600" },
    { bedrooms: 1.5 },
    { parking_spaces: -1 },
    { financing: "sim" },
    { purpose: "fake" },
    { secret: "no" },
    { neighborhoods: [null] },
    { preferences: "a".repeat(1001) },
  ])
    assert.throws(() => q.validateInterest(bad));
  const form = new FormData();
  form.set("purpose", "compra");
  form.set("financing", "false");
  form.set("bedrooms", "0");
  form.set("neighborhoods", "Catolé, Centro, Catolé");
  assert.deepEqual(q.interestFromForm(form), {
    purpose: "compra",
    neighborhoods: ["Catolé", "Centro"],
    bedrooms: 0,
    financing: false,
  });
});
test("WhatsApp templates are six editable intentions, not delivery receipts", () => {
  assert.equal(Object.keys(q.MESSAGE_TEMPLATES).length, 6);
  for (const kind of Object.keys(q.MESSAGE_TEMPLATES)) {
    const message = q.serviceMessage(kind, {
      name: "Cliente fictício",
      broker: "Corretor fictício",
      property: "Casa fictícia",
      code: "FIX-1",
      date: "10/11/2026 10:00",
      presentationUrl: "https://example.invalid/apresentacoes/fixture",
    });
    assert.ok(message.includes("Cliente fictício"));
    assert.ok(message.includes("Corretor fictício"));
    const url = new URL(q.reviewedWhatsAppUrl("83900000000", message));
    assert.equal(url.pathname, "/5583900000000");
    assert.equal(url.searchParams.get("text"), message);
  }
  assert.throws(() => q.reviewedWhatsAppUrl("invalid", "texto"));
  assert.throws(() => q.reviewedWhatsAppUrl("83900000000", ""));
});
test("draft parsing extracts explicit labels only, with no implicit microphone or save", () => {
  assert.deepEqual(
    q.draftFields("Nome: Cliente fictício\nWhatsApp: 83900000000"),
    { name: "Cliente fictício", phone: "83900000000" },
  );
  assert.deepEqual(q.draftFields("texto livre não confirmado"), {
    name: "",
    phone: "",
  });
  assert.throws(() => q.draftFields("x".repeat(2001)));
  const source = fs.readFileSync(
    new URL("../components/crm/ClientService.tsx", import.meta.url),
    "utf8",
  );
  assert.equal(/fbq\(|gtag\(|pushDataLayer\(/.test(source), false);
  const editor = fs.readFileSync(
    new URL("../components/crm/ClientEditor.tsx", import.meta.url),
    "utf8",
  );
  assert.equal(/getUserMedia\(|SpeechRecognition\(/.test(editor), false);
});

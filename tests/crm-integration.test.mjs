import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import Module from 'node:module';

function load(relative, dependencies = {}) {
  const file = fileURLToPath(new URL(relative, import.meta.url));
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const loadedModule = new Module(file);
  loadedModule.require = name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  };
  loadedModule._compile(source, file);
  return loadedModule.exports;
}
const filters = load('../lib/property-filters.ts');
const publication = load('../lib/property-publication.ts', { '@/lib/property-filters': filters });
const validation = load('../lib/broker-validation.ts');
const { serializeJsonLd } = load('../lib/structured-data.ts');
const published = { status: 'ativo', publish_on_site: true, workflow_status: 'aprovado', deleted_at: null };

test('publicacao exige aprovacao e flags explicitas, inclusive em base legada', () => {
  assert.equal(publication.isPublicProperty(published), true);
  for (const patch of [{ publish_on_site: false }, { deleted_at: '2026-10-13' }, { workflow_status: 'pendente' }, { workflow_status: undefined }, { status: 'rascunho' }, { publish_on_site: undefined }]) {
    assert.equal(publication.isPublicProperty({ ...published, ...patch }), false);
  }
  assert.equal(publication.isPublicProperty({ ...published, workflow_status: 'publicado', status: 'vendido' }), true);
});
test('consulta publica e sitemap aplicam a mesma barreira sem executar cedo', async () => {
  for (const columns of ['*', 'slug', 'slug,updated_at,created_at,city_slug,status']) {
    const operations = [];
    const builder = {
      select: value => { operations.push(['select', value]); return builder; },
      in: (key, value) => { operations.push(['in', key, value]); return builder; },
      eq: (key, value) => { operations.push(['eq', key, value]); return builder; },
      is: (key, value) => { operations.push(['is', key, value]); return builder; },
      then: () => { throw new Error('Query executed prematurely'); },
    };
    const { query } = await publication.publicPropertyQuery({ from: name => { assert.equal(name, 'properties'); return builder; } }, columns);
    assert.equal(query, builder);
    assert.deepEqual(operations, [['select', columns], ['in', 'status', filters.publicPropertyStatuses], ['eq', 'publish_on_site', true], ['is', 'deleted_at', null], ['in', 'workflow_status', ['aprovado', 'publicado']]]);
  }
});
test('preco BRL, milhoes e sob consulta preservados', () => {
  assert.equal(filters.getPropertyNumericPrice('R$ 850.000,00'), 850000);
  assert.equal(filters.getPropertyNumericPrice('1,5 milhões'), 1500000);
  assert.equal(filters.getPropertyNumericPrice('500 mil'), 500000);
  assert.equal(filters.getPropertyNumericPrice('Sob consulta'), null);
});
test('faixa acima de um milhao nao inclui o limite', () => {
  assert.equal(filters.matchesPrice({ price: 'R$ 1.000.000,00' }, 'acima-1milhao'), false);
  assert.equal(filters.matchesPrice({ price: 'R$ 1.000.001,00' }, 'acima-1milhao'), true);
  assert.equal(filters.matchesPrice({ price: 'R$ 500.000,00' }, '500mil'), true);
});
test('codigo comercial pesquisavel com filtros combinados', () => {
  const rows = [
    { ...published, id: 1, title: 'Apartamento Catolé', property_code: 'PRI-AP-000001', category: 'Apartamentos', city_slug: 'campina-grande', neighborhood_slug: 'catole', bedrooms: 3, price: 'R$ 850.000,00' },
    { ...published, id: 2, title: 'Casa', property_code: 'PRI-CS-000002', category: 'Casas', bedrooms: 1, price: 'R$ 200.000,00' },
  ];
  assert.deepEqual(filters.filterProperties(rows, { busca: 'PRI-AP-000001', categoria: 'apartamentos', cidade: 'campina-grande', bairro: 'catole', quartos: '3', preco: '2milhoes' }).map(x => x.id), [1]);
  assert.equal(filters.filterProperties(rows, { busca: 'PRI-AP-000001', quartos: '4' }).length, 0);
});
test('JSON-LD nao permite fechar a tag script e preserva conteudo', () => {
  const value = { title: '</script><script>alert(1)</script>' };
  const json = serializeJsonLd(value);
  assert.equal(json.includes('<'), false);
  assert.deepEqual(JSON.parse(json), value);
});
test('cadastro de corretor valida formato e tipos sem dados pessoais reais', () => {
  assert.equal(validation.validateBrokerCreate({ name: 'Fixture', email: 'fixture@example.invalid' }), null);
  for (const value of [null, [], {}, { name: 1, email: 'fixture@example.invalid' }, { name: 'Fixture', email: 'invalid' }, { name: 'Fixture', email: 'fixture@example.invalid', active: 'true' }, { name: 'Fixture', email: 'fixture@example.invalid', bio: {} }, { name: 'Fixture', email: 'fixture@example.invalid', password: 'short' }]) assert.ok(validation.validateBrokerCreate(value));
});

async function brokerRoute(role, body, invalidUser = false) {
  const oldKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'synthetic-server-key-not-real';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.invalid';
  const builder = { select: () => builder, eq: () => builder, maybeSingle: async () => ({ data: role, error: null }) };
  const admin = { auth: { getUser: async () => ({ data: { user: invalidUser ? null : { id: 'fixture' } }, error: invalidUser ? { message: 'invalid' } : null }) }, from: () => builder };
  try {
    const route = load('../app/api/admin/brokers/route.ts', { '@supabase/supabase-js': { createClient: () => admin }, 'next/server': { NextResponse: Response }, '@/lib/broker-validation': validation, '@/lib/whatsapp': { normalizeBrazilWhatsApp: x => x } });
    return await route.POST(new Request('http://localhost/api/admin/brokers', { method: 'POST', headers: { Authorization: 'Bearer synthetic', 'Content-Type': 'application/json' }, body }));
  } finally {
    if (oldKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = oldKey;
    if (oldUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
  }
}
test('admin invalido/desativado e corretor nao criam contas', async () => {
  assert.equal((await brokerRoute({ role: 'admin', disabled_at: null }, '{}', true)).status, 401);
  assert.equal((await brokerRoute({ role: 'admin', disabled_at: '2026-10-13' }, '{}')).status, 403);
  assert.equal((await brokerRoute({ role: 'corretor', disabled_at: null }, '{}')).status, 403);
});
test('API autorizada rejeita JSON invalido ou arrays antes de criar Auth user', async () => {
  for (const body of ['invalid-json', '[]', '{}']) assert.equal((await brokerRoute({ role: 'admin', disabled_at: null }, body)).status, 400);
});

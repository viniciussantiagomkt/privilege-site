export const DEMO_PROFILES = [
  { alias: "a", id: "11111111-1111-4111-8111-111111111111", role: "broker", name: "Corretora Helena · sintético" },
  { alias: "b", id: "22222222-2222-4222-8222-222222222222", role: "broker", name: "Corretor Rafael · sintético" },
  { alias: "gestor", id: "33333333-3333-4333-8333-333333333333", role: "manager", name: "Gestão · sintético" },
  { alias: "admin", id: "44444444-4444-4444-8444-444444444444", role: "admin", name: "Administração · sintético" },
];
export function demoData(now = new Date()) {
  const a = DEMO_PROFILES[0].id, b = DEMO_PROFILES[1].id;
  const when = h => new Date(now.getTime() + h * 3600000).toISOString();
  const created_at = when(-120);
  return {
    brokers: DEMO_PROFILES.map(p => ({ ...p, email: `${p.alias}@example.invalid`, active: true, phone: null, creci: "DEMO" })),
    clients: [
      { id: 1, name: "Marina · cliente sintética", broker_id: a, phone: "558300000101", email: null, notes: "Preferência por Catolé", contact_type: "cliente", interest_profile: { purpose: "compra", bedrooms: 3, city: "Campina Grande" }, interest_revision: 0, deleted_at: null, created_at },
      { id: 2, name: "Paulo · proprietário sintético", broker_id: a, phone: "558300000102", contact_type: "proprietario", interest_profile: {}, interest_revision: 0, deleted_at: null, created_at },
      { id: 3, name: "Cliente privado B · sintético", broker_id: b, phone: "558300000103", contact_type: "cliente", interest_profile: { purpose: "aluguel" }, interest_revision: 0, deleted_at: null, created_at },
    ],
    leads: [{ id: 1, name: "Consulta Catolé · sintética", broker_id: a, origin_type: "personal", property_id: 1, property_title: "Apartamento no Catolé", phone: "558300000104", email: null, source: "manual", status: "novo", first_contact_at: null, notes: "Deseja visitar no sábado", created_at, deleted_at: null }],
    properties: [
      { id: 1, title: "Apartamento no Catolé", property_code: "DEMO-01", city: "Campina Grande", neighborhood: "Catolé", category: "apartamentos", price: "R$ 580.000", bedrooms: 3, area: "104", images: ["/categories/condominios.webp"], owner_id: a, broker_id: a, status: "ativo", workflow_status: "aprovado", presentation_enabled: true },
      { id: 2, title: "Casa no Alto Branco", property_code: "DEMO-02", city: "Campina Grande", neighborhood: "Alto Branco", category: "casas", price: "R$ 780.000", bedrooms: 3, area: "180", images: ["/categories/casas.webp"], owner_id: a, broker_id: a, status: "ativo", workflow_status: "aprovado", presentation_enabled: true },
      { id: 3, title: "Captação em andamento", property_code: "DEMO-03", city: "Campina Grande", neighborhood: null, category: "casas", price: "Sob consulta", bedrooms: 2, area: null, images: [], owner_id: a, broker_id: a, status: "rascunho", workflow_status: "rascunho", presentation_enabled: false },
      { id: 4, title: "Carteira particular B", property_code: "DEMO-04", city: "João Pessoa", neighborhood: "Bessa", category: "apartamentos", price: "R$ 920.000", bedrooms: 2, area: "86", images: ["/categories/condominios.webp"], owner_id: b, broker_id: b, status: "ativo", workflow_status: "rascunho", presentation_enabled: false },
    ].map(p => ({ ...p, slug: `demo-${p.id}`, description: "Material sintético para desenvolvimento local.", location: [p.neighborhood, p.city].filter(Boolean).join(" · "), bathrooms: 2, garage: 1, featured: false, publish_on_site: false, deleted_at: null, created_at })),
    tasks: [
      { id: 1, title: "Retornar para Marina", broker_id: a, client_id: 1, lead_id: null, property_id: 1, due_at: when(-22), status: "pendente", description: "Alinhar disponibilidade para visita", updated_at: created_at, created_at, deleted_at: null },
      { id: 2, title: "Conferir fotos da captação", broker_id: a, client_id: 2, lead_id: null, property_id: 3, due_at: when(2), status: "pendente", description: "Complementar a ficha", updated_at: created_at, created_at, deleted_at: null },
      { id: 3, title: "Acompanhar proposta", broker_id: a, client_id: 1, lead_id: null, property_id: 1, due_at: when(48), status: "pendente", updated_at: created_at, created_at, deleted_at: null },
      { id: 4, title: "Retorno privado B", broker_id: b, client_id: 3, due_at: when(1), status: "pendente", updated_at: created_at, created_at, deleted_at: null },
    ],
    visits: [{ id: 1, broker_id: a, client_id: 1, property_id: 1, scheduled_at: when(3), status: "agendada", notes: "Confirmar portaria", created_at }],
    proposals: [{ id: 1, broker_id: a, client_id: 1, property_id: 1, value: 550000, status: "enviada", created_at }, { id: 2, broker_id: a, client_id: 1, property_id: null, value: null, status: "rascunho", created_at }],
    negotiations: [{ id: 1, proposal_id: 1, status: "aberta", notes: "Conferir condições de pagamento", created_at }],
    sales: [], notifications: [],
    crm_contact_links: [{ id: 1, contact_id: 2, property_id: 3, lead_id: null, relation: "proprietario", created_at }],
  };
}

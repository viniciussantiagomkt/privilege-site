"use client";
import { SlidersHorizontal, X } from "lucide-react";
import { type CrmProperty } from "@/lib/crm/model";
import { type PortfolioFilters, EMPTY_PORTFOLIO_FILTERS } from "@/lib/crm/operations";
import { Modal, Button } from "./UI";

export function PortfolioFiltersBar({ rows, value, onChange }: { rows: CrmProperty[]; value: PortfolioFilters; onChange: (f: PortfolioFilters) => void }) {
  const cities = [...new Set(rows.map(p => p.city).filter((s): s is string => !!s))].sort();
  const categories = [...new Set(rows.map(p => p.category))].sort();
  const active = Object.values(value).some(Boolean);
  return <div className="crm-portfolio-filters" aria-label="Busca de imóveis">
    <label>Cidade<select value={value.city} onChange={e => onChange({ ...value, city: e.target.value })}><option value="">Todas</option>{cities.map(c => <option key={c}>{c}</option>)}</select></label>
    <label>Categoria<select value={value.category} onChange={e => onChange({ ...value, category: e.target.value })}><option value="">Todas</option>{categories.map(c => <option key={c}>{c}</option>)}</select></label>
    <label>Valor máximo (R$)<input type="number" min="0" step="1000" value={value.maxPrice} placeholder="Sem limite" onChange={e => onChange({ ...value, maxPrice: e.target.value })} /></label>
    <label>Quartos<select value={value.bedrooms} onChange={e => onChange({ ...value, bedrooms: e.target.value })}><option value="">Qualquer</option>{[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} ou mais</option>)}</select></label>
    <label className="crm-ops-check"><input type="checkbox" checked={value.available} onChange={e => onChange({ ...value, available: e.target.checked })} />Somente disponíveis</label>
    {active && <Button secondary onClick={() => onChange({ ...EMPTY_PORTFOLIO_FILTERS })}><SlidersHorizontal size={15} />Limpar filtros</Button>}
  </div>;
}
export function PropertyComparison({ rows, onClose, onOpen }: { rows: CrmProperty[]; onClose: () => void; onOpen: (p: CrmProperty) => void }) {
  return <Modal title="Comparar imóveis" description={`${rows.length} imóveis do catálogo autorizado`} onClose={onClose}>
    <div className="crm-comparison">{rows.map(p => <article key={p.id}>
      <span className="crm-eyebrow">{p.property_code || `#${p.id}`}</span><h3>{p.title}</h3><strong>{p.price || "Valor a confirmar"}</strong>
      <dl>{[["Localização", [p.city, p.neighborhood].filter(Boolean).join(" · ") || p.location], ["Quartos", p.bedrooms ?? "Não informado"], ["Banheiros", p.bathrooms ?? "Não informado"], ["Vagas de carro", p.garage ?? "Não informado"], ["Área", p.area ? `${p.area} m²` : "Não informada"], ["Disponibilidade", p.status || "A confirmar"]].map(([name, v]) => <div key={name}><dt>{name}</dt><dd>{v}</dd></div>)}</dl>
      <Button secondary onClick={() => { onClose(); onOpen(p); }}>Abrir ficha</Button>
    </article>)}</div>
    <Button secondary onClick={onClose}><X size={15} />Fechar comparação</Button>
  </Modal>;
}

import fs from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

export const fixtureProperty = {
  id: 903, slug: "fixture-isolamento", title: "Imóvel fictício de teste",
  description: "Descrição fictícia para regressão local.", location: "Endereço fictício",
  address: "Rua fictícia", city: "Cidade fictícia", neighborhood: "Bairro fictício",
  latitude: -7.2, longitude: -35.8, category: "Casas", price: "R$ 500.000",
  bedrooms: 2, bathrooms: 1, garage: 1, area: "80", featured: false,
  status: "ativo", images: ["https://images.unsplash.com/fixture-image"],
  videos: ["https://www.youtube.com/watch?v=abcdefghijk", "https://vimeo.com/123456",
    "https://external.invalid/fixture.mp4", "https://www.google.com/maps?q=fixture&output=embed"],
};
const cache = new Map();
const image = ({ src, alt, width, height, className }) => createElement("img", { src, alt, width, height, className });
const nullComponent = () => null;
const emptyNames = ["Navbar", "Footer", "Breadcrumb", "FavoriteButton", "PropertyCard",
  "PropertyViewTracker", "ShareButton", "WhatsAppLeadButton", "MinhaCasaMinhaVidaBadge"];
const query = {
  eq() { return this; }, neq() { return this; },
  async maybeSingle() { return { data: fixtureProperty, error: null }; },
  async limit() { return { data: [], error: null }; },
};
const mocks = {
  "@/lib/supabase": { supabase: {} },
  "@/lib/supabase-server": { createServerClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ data: [] }) }) }),
  }) },
  "@/lib/property-publication": { publicPropertyQuery: async () => ({ query }) },
  "@/lib/property-media": { attachPropertyImages: rows => rows },
  "next/image": { default: image },
  "next/script": { default: ({ id, type, dangerouslySetInnerHTML, children }) =>
    createElement("script", { id, type, dangerouslySetInnerHTML }, children) },
  "next/link": { default: ({ children, ...props }) => createElement("a", props, children) },
  "next/navigation": { notFound: () => { throw new Error("Fixture missing"); } },
};
for (const name of emptyNames) mocks["@/components/" + name] = { [name]: nullComponent };

export function loadFixtureModule(relative) {
  const file = path.resolve(relative);
  if (cache.has(file)) return cache.get(file).exports;
  const m = new Module(file);
  cache.set(file, m);
  const require = createRequire(file);
  m.require = name => {
    if (name.endsWith(".css")) return {};
    if (mocks[name]) return mocks[name];
    if (name.startsWith("@/")) {
      const base = path.resolve(name.slice(2));
      const target = [base + ".ts", base + ".tsx"].find(p => fs.existsSync(p));
      if (target) return loadFixtureModule(target);
    }
    return require(name);
  };
  m._compile(ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, file);
  return m.exports;
}

export async function renderMediaFixtures(mode) {
  const old = process.env.PRIVILEGE_MEDIA_POLICY;
  process.env.PRIVILEGE_MEDIA_POLICY = mode;
  try {
    const { PropertyForm } = loadFixtureModule("components/PropertyForm.tsx");
    const { default: PropertyPage } = loadFixtureModule("app/imoveis/[slug]/page.tsx");
    const { VideoEmbed } = loadFixtureModule("components/VideoEmbed.tsx");
    return {
      form: renderToStaticMarkup(createElement(PropertyForm, { initialData: fixtureProperty })),
      page: renderToStaticMarkup(await PropertyPage({ params: Promise.resolve({ slug: fixtureProperty.slug }) })),
      videos: fixtureProperty.videos.map(url => renderToStaticMarkup(createElement(VideoEmbed, { url, title: "Vídeo fictício" }))).join(""),
    };
  } finally {
    if (old === undefined) delete process.env.PRIVILEGE_MEDIA_POLICY;
    else process.env.PRIVILEGE_MEDIA_POLICY = old;
  }
}

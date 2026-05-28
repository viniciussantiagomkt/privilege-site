"use client";

import NextImage from "next/image";
import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Info,
  MapPin,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { propertyCategories } from "@/lib/property-filters";
import { Broker, Property } from "@/types/property";

type PropertyFormData = Omit<Property, "id"> & {
  id?: number;
};

interface PropertyFormProps {
  initialData?: Property | null;
  onSaved?: (property: Property) => void;
  compact?: boolean;
}

interface GoogleGeocodeResult {
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const emptyProperty: PropertyFormData = {
  slug: "",
  title: "",
  description: "",
  location: "",
  latitude: null,
  longitude: null,
  address: "",
  city: "Campina Grande",
  city_slug: "campina-grande",
  neighborhood: "",
  neighborhood_slug: "",
  category: "Casas",
  type: "",
  status: "ativo",
  price: "",
  condominium: "",
  iptu: "",
  bedrooms: 0,
  bathrooms: 0,
  garage: 0,
  area: "",
  featured: false,
  images: [],
  main_image_url: "",
  videos: [],
  video_url: "",
  virtual_tour_url: "",
  broker_id: null,
  meta_title: "",
  meta_description: "",
  keywords: [],
  og_image: "",
  whatsapp: "",
  external_url: "",
};

export function createSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatMoney(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) return "";

  const amount = Number(digits) / 100;

  return amount.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function imageUrlsFromText(value: string) {
  return value
    .split("\n")
    .map((image) => image.trim())
    .filter(Boolean);
}

function urlsFromText(value: string) {
  return imageUrlsFromText(value);
}

function calculateScore(form: PropertyFormData, imagesText: string) {
  const images = imageUrlsFromText(imagesText);
  let score = 0;

  if (form.title.trim().length > 8) score += 12;
  if (form.slug.trim()) score += 8;
  if (form.category.trim()) score += 8;
  if (form.description.trim().length >= 120) score += 18;
  if (form.location.trim().length > 4) score += 14;
  if (form.price.trim()) score += 10;
  if ((form.bedrooms ?? 0) > 0) score += 6;
  if ((form.bathrooms ?? 0) > 0) score += 6;
  if (form.area) score += 6;
  if (images.length >= 5) score += 12;
  else if (images.length > 0) score += 6;

  return Math.min(score, 100);
}

function getSuggestions(form: PropertyFormData, imagesText: string) {
  const images = imageUrlsFromText(imagesText);
  const suggestions: string[] = [];

  if (form.description.trim().length < 120) {
    suggestions.push("A descrição ainda está curta para um anúncio premium.");
  }

  if (images.length < 5) {
    suggestions.push("Adicione no minimo 5 imagens para aumentar a conversao.");
  }

  if (!form.location.trim()) {
    suggestions.push("Preencha a localização corretamente para melhorar mapa e busca.");
  }

  if (!form.price.trim()) {
    suggestions.push("Informe o valor ou use 'Sob consulta'.");
  }

  return suggestions;
}

async function compressImage(file: File) {
  if (!file.type.startsWith("image/")) return file;

  const imageUrl = URL.createObjectURL(file);
  const image = new Image();
  image.src = imageUrl;
  await image.decode();

  const maxWidth = 1800;
  const scale = Math.min(1, maxWidth / image.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);

  const context = canvas.getContext("2d");
  context?.drawImage(image, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(imageUrl);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.82)
  );

  if (!blob) return file;

  return new File([blob], `${createSlug(file.name)}.webp`, {
    type: "image/webp",
  });
}

export function PropertyForm({
  initialData,
  onSaved,
  compact = false,
}: PropertyFormProps) {
  const initialForm = useMemo(
    () => ({
      ...emptyProperty,
      ...initialData,
      images: initialData?.images ?? [],
    }),
    [initialData]
  );

  const [form, setForm] = useState<PropertyFormData>(initialForm);
  const [imagesText, setImagesText] = useState(initialForm.images.join("\n"));
  const [videosText, setVideosText] = useState((initialForm.videos ?? []).join("\n"));
  const [slugTouched, setSlugTouched] = useState(Boolean(initialData?.slug));
  const [locationQuery, setLocationQuery] = useState(initialForm.location);
  const [locationResults, setLocationResults] = useState<GoogleGeocodeResult[]>([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [brokers, setBrokers] = useState<Broker[]>([]);

  const score = calculateScore(form, imagesText);
  const suggestions = getSuggestions(form, imagesText);
  const imageUrls = imageUrlsFromText(imagesText);
  const videoUrls = urlsFromText(videosText);

  useEffect(() => {
    let active = true;

    async function loadBrokers() {
      const { data } = await supabase
        .from("brokers")
        .select("id,name,email,phone,whatsapp,active")
        .eq("active", true)
        .order("name", { ascending: true });

      if (active) {
        setBrokers((data || []) as Broker[]);
      }
    }

    void loadBrokers();

    return () => {
      active = false;
    };
  }, []);

  function updateField<K extends keyof PropertyFormData>(
    field: K,
    value: PropertyFormData[K]
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateTitle(value: string) {
    setForm((current) => ({
      ...current,
      title: value,
      slug: slugTouched ? current.slug : createSlug(value),
      meta_title: current.meta_title || value,
    }));
  }

  function updateImages(urls: string[]) {
    setImagesText(urls.join("\n"));
  }

  function moveImage(index: number, direction: -1 | 1) {
    const urls = [...imageUrls];
    const target = index + direction;

    if (target < 0 || target >= urls.length) return;

    [urls[index], urls[target]] = [urls[target], urls[index]];
    updateImages(urls);
  }

  function removeImage(index: number) {
    updateImages(imageUrls.filter((_, currentIndex) => currentIndex !== index));
  }

  async function geocodeAddress() {
    if (!locationQuery.trim()) return;

    if (!googleMapsKey) {
      updateField("location", locationQuery);
      setMessage(
        "Endereço salvo como texto. Configure NEXT_PUBLIC_GOOGLE_MAPS_API_KEY para buscar coordenadas automaticamente."
      );
      return;
    }

    setLocationLoading(true);
    setMessage("");

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        locationQuery
      )}&key=${googleMapsKey}`
    );
    const data = (await response.json()) as {
      results?: GoogleGeocodeResult[];
      status?: string;
    };

    setLocationResults(data.results ?? []);
    setLocationLoading(false);

    if (!data.results?.length) {
      setMessage("Nenhum endereço encontrado para a busca informada.");
    }
  }

  function applyLocation(result: GoogleGeocodeResult) {
    updateField("location", result.formatted_address);
    updateField("address", result.formatted_address);
    updateField("latitude", result.geometry.location.lat);
    updateField("longitude", result.geometry.location.lng);
    setLocationQuery(result.formatted_address);
    setLocationResults([]);
  }

  async function uploadFiles(files: File[]) {
    if (!files.length) return;

    setUploading(true);
    setMessage("");

    const uploadedUrls: string[] = [];
    const folder = form.slug || createSlug(form.title) || "rascunho";

    for (const [index, originalFile] of files.entries()) {
      const file = await compressImage(originalFile);
      const path = `${folder}/${file.lastModified}-${index}-${createSlug(file.name)}`;
      const { error } = await supabase.storage
        .from("property-images")
        .upload(path, file, {
          upsert: true,
          cacheControl: "31536000",
        });

      if (error) {
        setMessage(
          "Não foi possível enviar. Crie no Supabase Storage um bucket público chamado property-images com política de upload para usuários autenticados."
        );
        continue;
      }

      const { data } = supabase.storage
        .from("property-images")
        .getPublicUrl(path);

      uploadedUrls.push(data.publicUrl);
    }

    if (uploadedUrls.length) {
      updateImages([...imageUrls, ...uploadedUrls]);
    }

    setUploading(false);
  }

  async function uploadImages(event: ChangeEvent<HTMLInputElement>) {
    await uploadFiles(Array.from(event.target.files ?? []));
  }

  async function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    await uploadFiles(Array.from(event.dataTransfer.files ?? []));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const basePayload = {
      slug: form.slug || createSlug(form.title),
      title: form.title,
      description: form.description,
      location: form.location,
      address: form.address || form.location,
      city: form.city || null,
      city_slug: form.city ? createSlug(form.city) : null,
      neighborhood: form.neighborhood || null,
      neighborhood_slug: form.neighborhood ? createSlug(form.neighborhood) : null,
      category: form.category,
      type: form.type || null,
      status: form.status || "ativo",
      price: form.price,
      condominium: form.condominium || null,
      iptu: form.iptu || null,
      bedrooms: Number(form.bedrooms ?? 0),
      bathrooms: Number(form.bathrooms ?? 0),
      garage: Number(form.garage ?? 0),
      area: form.area || "",
      featured: form.featured,
      images: imageUrls,
      main_image_url: imageUrls[0] ?? null,
      videos: videoUrls,
      video_url: videoUrls[0] ?? form.video_url ?? null,
      virtual_tour_url: form.virtual_tour_url || null,
      broker_id: form.broker_id || null,
      meta_title: form.meta_title || form.title,
      meta_description: form.meta_description || form.description.slice(0, 160),
      keywords: form.keywords ?? [],
      og_image: form.og_image || imageUrls[0] || null,
      whatsapp: form.whatsapp || null,
      external_url: form.external_url || null,
    };

    const extendedPayload = {
      ...basePayload,
      latitude: form.latitude,
      longitude: form.longitude,
    };

    let query = initialData?.id
      ? supabase
          .from("properties")
          .update(extendedPayload)
          .eq("id", initialData.id)
          .select()
          .single()
      : supabase.from("properties").insert(extendedPayload).select().single();

    let { data, error } = await query;

    if (
      error &&
      (error.message.toLowerCase().includes("latitude") ||
        error.message.toLowerCase().includes("longitude") ||
        error.message.toLowerCase().includes("column"))
    ) {
      query = initialData?.id
        ? supabase
            .from("properties")
            .update(basePayload)
            .eq("id", initialData.id)
            .select()
            .single()
        : supabase.from("properties").insert(basePayload).select().single();

      const fallback = await query;
      data = fallback.data;
      error = fallback.error;
    }

    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (data) {
      const savedProperty = data as Property;

      await supabase.from("property_images").delete().eq("property_id", savedProperty.id);
      if (imageUrls.length) {
        await supabase.from("property_images").insert(
          imageUrls.map((url, index) => ({
            property_id: savedProperty.id,
            url,
            sort_order: index,
            is_main: index === 0,
            alt: `${savedProperty.title} - imagem ${index + 1}`,
          }))
        );
      }

      await supabase.from("property_videos").delete().eq("property_id", savedProperty.id);
      if (videoUrls.length) {
        await supabase.from("property_videos").insert(
          videoUrls.map((url, index) => ({
            property_id: savedProperty.id,
            url,
            sort_order: index,
            title: `${savedProperty.title} - video ${index + 1}`,
            provider: url.includes("supabase") ? "upload" : "external",
          }))
        );
      }

      await supabase.rpc("sync_property_media_arrays", {
        target_property_id: savedProperty.id,
      });

      onSaved?.(data as Property);
    }

    setMessage(
      initialData?.id
        ? "Imóvel atualizado com sucesso."
        : "Imóvel cadastrado com sucesso."
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
      <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 md:rounded-[28px] md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <span className="text-[#72A3BF] uppercase tracking-[0.3em] text-xs">
              Qualidade do anuncio
            </span>
            <h3 className="mt-3 text-2xl font-bold md:text-3xl">{score}%</h3>
          </div>

          <div className="h-3 flex-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#72A3BF]"
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        {suggestions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion}
                className="flex gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70"
              >
                <Info className="h-5 w-5 text-[#72A3BF] shrink-0" />
                {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>

      <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 md:rounded-[28px] md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="h-5 w-5 text-[#72A3BF]" />
          <h3 className="text-xl font-bold md:text-2xl">Informacoes basicas</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Título do imóvel" help="Use um título claro e comercial.">
            <input
              value={form.title}
              onChange={(event) => updateTitle(event.target.value)}
              placeholder="Casa Luxo Alphaville"
              className="admin-input"
              required
            />
          </Field>

          <Field label="Slug" help="Atualiza automaticamente, mas pode ser editado.">
            <input
              value={form.slug}
              onChange={(event) => {
                setSlugTouched(true);
                updateField("slug", createSlug(event.target.value));
              }}
              placeholder="casa-luxo-alphaville"
              className="admin-input"
              required
            />
          </Field>

          <Field label="Categoria" help="Controla busca e paginas de categoria.">
            <select
              value={form.category}
              onChange={(event) => updateField("category", event.target.value)}
              className="admin-input bg-[#030F18]"
            >
              {propertyCategories
                .filter((category) => category.value)
                .map((category) => (
                  <option key={category.value} value={category.label}>
                    {category.label}
                  </option>
                ))}
            </select>
          </Field>

          <Field label="Tipo" help="Exemplo: casa terrea, cobertura, lote ou sala comercial.">
            <input
              value={form.type ?? ""}
              onChange={(event) => updateField("type", event.target.value)}
              placeholder="Casa em condomínio"
              className="admin-input"
            />
          </Field>

          <Field label="Status" help="Controle operacional do anuncio.">
            <select
              value={form.status ?? "ativo"}
              onChange={(event) => updateField("status", event.target.value)}
              className="admin-input bg-[#030F18]"
            >
              <option value="ativo">Ativo</option>
              <option value="reservado">Reservado</option>
              <option value="vendido">Vendido</option>
              <option value="alugado">Alugado</option>
              <option value="rascunho">Rascunho</option>
            </select>
          </Field>

          <Field
            label="Descrição"
            help="Descrição completa aumenta conversão e melhora SEO."
            className="md:col-span-2"
          >
            <textarea
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder="Descreva arquitetura, diferenciais, localização e experiência do imóvel."
              className="admin-input min-h-36 p-5"
            />
          </Field>
        </div>
      </section>

      <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 md:rounded-[28px] md:p-6">
        <h3 className="mb-6 text-xl font-bold md:text-2xl">Informacoes tecnicas</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Field label="Preço" help="Use valor em R$ ou 'Sob consulta'.">
            <input
              value={form.price}
              onChange={(event) => updateField("price", formatMoney(event.target.value))}
              placeholder="R$ 2.500.000,00"
              className="admin-input"
            />
          </Field>

          <Field label="Área" help="Área privativa ou total em metros quadrados.">
            <input
              value={form.area ?? ""}
              onChange={(event) => updateField("area", event.target.value)}
              placeholder="Área em m²"
              className="admin-input"
            />
          </Field>

          <Field label="Condomínio" help="Valor mensal do condomínio.">
            <input
              value={form.condominium ?? ""}
              placeholder="R$ 0,00"
              onChange={(event) => {
                updateField("condominium", formatMoney(event.currentTarget.value));
              }}
              className="admin-input"
            />
          </Field>

          <Field label="IPTU" help="Valor anual ou mensal do IPTU.">
            <input
              value={form.iptu ?? ""}
              placeholder="R$ 0,00"
              onChange={(event) => {
                updateField("iptu", formatMoney(event.currentTarget.value));
              }}
              className="admin-input"
            />
          </Field>

          <Field label="Quartos" help="Quantidade de quartos.">
            <input
              type="number"
              min={0}
              value={form.bedrooms ?? 0}
              onChange={(event) => updateField("bedrooms", Number(event.target.value))}
              placeholder="Quantidade de quartos"
              className="admin-input"
            />
          </Field>

          <Field label="Banheiros" help="Quantidade de banheiros.">
            <input
              type="number"
              min={0}
              value={form.bathrooms ?? 0}
              onChange={(event) => updateField("bathrooms", Number(event.target.value))}
              placeholder="Quantidade de banheiros"
              className="admin-input"
            />
          </Field>

          <Field label="Vagas" help="Vagas de garagem.">
            <input
              type="number"
              min={0}
              value={form.garage ?? 0}
              onChange={(event) => updateField("garage", Number(event.target.value))}
              placeholder="Vagas de garagem"
              className="admin-input"
            />
          </Field>

          <label className="h-14 rounded-2xl border border-white/10 bg-black/20 px-5 flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(event) => updateField("featured", event.target.checked)}
            />
            Imóvel em destaque
          </label>
        </div>
      </section>

      <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 md:rounded-[28px] md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <MapPin className="h-5 w-5 text-[#72A3BF]" />
          <h3 className="text-xl font-bold md:text-2xl">Localização inteligente</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_180px] gap-5">
          <Field label="Buscar endereço" help="Pesquise rua, bairro, cidade ou condomínio.">
            <input
              value={locationQuery}
              onChange={(event) => setLocationQuery(event.target.value)}
              placeholder="Rua Joao Suassuna, Campina Grande"
              className="admin-input"
            />
          </Field>

          <button
            type="button"
            onClick={geocodeAddress}
            disabled={locationLoading}
            className="self-end h-14 rounded-2xl bg-[#72A3BF] text-black font-semibold disabled:opacity-60"
          >
            {locationLoading ? "Buscando..." : "Usar localização"}
          </button>
        </div>

        {locationResults.length > 0 && (
          <div className="grid gap-3 mt-5">
            {locationResults.slice(0, 4).map((result) => (
              <button
                type="button"
                key={`${result.formatted_address}-${result.geometry.location.lat}`}
                onClick={() => applyLocation(result)}
                className="rounded-2xl border border-white/10 bg-black/20 p-4 text-left hover:bg-white/10"
              >
                {result.formatted_address}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
          <Field label="Cidade" help="Usado para filtros e SEO local.">
            <input
              value={form.city ?? ""}
              onChange={(event) => {
                updateField("city", event.target.value);
                updateField("city_slug", createSlug(event.target.value));
              }}
              placeholder="Campina Grande"
              className="admin-input"
              required
            />
          </Field>

          <Field label="Bairro" help="Usado para busca textual e filtros.">
            <input
              value={form.neighborhood ?? ""}
              onChange={(event) => {
                updateField("neighborhood", event.target.value);
                updateField("neighborhood_slug", createSlug(event.target.value));
              }}
              placeholder="Catole"
              className="admin-input"
            />
          </Field>

          <Field label="Localização salva" help="Texto exibido no site.">
            <input
              value={form.location}
              onChange={(event) => updateField("location", event.target.value)}
              placeholder="Endereço formatado"
              className="admin-input"
              required
            />
          </Field>

          <Field label="Endereço completo" help="Endereço interno para mapa e operação.">
            <input
              value={form.address ?? ""}
              onChange={(event) => updateField("address", event.target.value)}
              placeholder="Rua, numero, bairro, cidade"
              className="admin-input"
            />
          </Field>

          <Field label="Latitude" help="Gerado pelo Google Maps.">
            <input value={form.latitude ?? ""} readOnly className="admin-input text-white/50" />
          </Field>

          <Field label="Longitude" help="Gerado pelo Google Maps.">
            <input value={form.longitude ?? ""} readOnly className="admin-input text-white/50" />
          </Field>
        </div>

        <div className="mt-5 overflow-hidden rounded-[24px] border border-white/10 bg-black/20">
          <iframe
            title="Preview do mapa"
            src={`https://www.google.com/maps?q=${encodeURIComponent(
              form.latitude && form.longitude
                ? `${form.latitude},${form.longitude}`
                : form.location || locationQuery || "Campina Grande, PB"
            )}&output=embed`}
            width="100%"
            height="300"
            loading="lazy"
          />
        </div>
      </section>

      <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 md:rounded-[28px] md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <ImagePlus className="h-5 w-5 text-[#72A3BF]" />
          <h3 className="text-xl font-bold md:text-2xl">Mídia do imóvel</h3>
        </div>

        <label
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed p-6 text-center transition ${
            dragging
              ? "border-[#72A3BF] bg-[#72A3BF]/10"
              : "border-white/20 bg-black/20 hover:bg-white/5"
          }`}
        >
          <Upload className="h-8 w-8 text-[#72A3BF]" />
          <span className="mt-4 font-semibold">
            {uploading ? "Enviando e comprimindo..." : "Arraste ou selecione imagens"}
          </span>
          <span className="text-sm text-white/50 mt-2">
            Upload múltiplo, compressão WebP e pasta por imóvel.
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={uploadImages}
            className="hidden"
          />
        </label>

        {imageUrls.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
            {imageUrls.map((image, index) => (
              <div
                key={`${image}-${index}`}
                className="overflow-hidden rounded-2xl border border-white/10 bg-black/20"
              >
                <div className="relative h-40">
                  <NextImage
                    src={image}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover"
                  />
                  {index === 0 && (
                    <span className="absolute left-3 top-3 rounded-full bg-[#72A3BF] px-3 py-1 text-xs font-semibold text-black">
                      Principal
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between p-3">
                  <button type="button" onClick={() => moveImage(index, -1)} className="admin-icon-button">
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => moveImage(index, 1)} className="admin-icon-button">
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => removeImage(index)} className="admin-icon-button">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <textarea
          value={imagesText}
          onChange={(event) => setImagesText(event.target.value)}
          placeholder="URLs das imagens, uma por linha"
          className="mt-5 w-full min-h-32 rounded-2xl border border-white/10 bg-black/20 p-5 outline-none"
        />

        <Field
          label="Vídeos do imóvel"
          help="Cole URLs de YouTube, Vimeo, tour virtual ou videos hospedados, uma por linha."
          className="mt-5"
        >
          <textarea
            value={videosText}
            onChange={(event) => setVideosText(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="admin-input min-h-28 p-5"
          />
        </Field>
      </section>

      {!compact && (
        <section className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 md:rounded-[28px] md:p-6">
          <h3 className="mb-6 text-xl font-bold md:text-2xl">SEO e comercial</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Field label="Meta title" help="Sugerido automaticamente pelo titulo.">
              <input
                value={form.meta_title ?? ""}
                onChange={(event) => updateField("meta_title", event.target.value)}
                placeholder="Casa em Condomínio no Catolé | Privilege Imóveis"
                className="admin-input"
              />
            </Field>
            <Field label="WhatsApp do corretor" help="Numero de atendimento especifico.">
              <input
                value={form.whatsapp ?? ""}
                onChange={(event) => updateField("whatsapp", event.target.value)}
                placeholder="5583999521041"
                className="admin-input"
              />
            </Field>
            <Field label="Corretor responsável" help="Vincula leads e edição operacional ao corretor.">
              <select
                value={form.broker_id ?? ""}
                onChange={(event) => updateField("broker_id", event.target.value || null)}
                className="admin-input bg-[#030F18]"
              >
                <option value="">Sem corretor vinculado</option>
                {brokers.map((broker) => (
                  <option key={broker.id} value={broker.id}>
                    {broker.name || broker.email || broker.id}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Meta description" help="Resumo para Google e redes sociais." className="md:col-span-2">
              <textarea
                value={form.meta_description ?? ""}
                onChange={(event) => updateField("meta_description", event.target.value)}
                placeholder="Resumo curto para Google e redes sociais."
                className="admin-input min-h-24 p-5"
              />
            </Field>
            <Field label="Tour virtual" help="Link externo para Matterport, YouTube ou landing de apresentação.">
              <input
                value={form.virtual_tour_url ?? ""}
                onChange={(event) => updateField("virtual_tour_url", event.target.value)}
                placeholder="https://..."
                className="admin-input"
              />
            </Field>
            <Field label="Link externo" help="Opcional para ficha, proposta ou CRM.">
              <input
                value={form.external_url ?? ""}
                onChange={(event) => updateField("external_url", event.target.value)}
                placeholder="https://..."
                className="admin-input"
              />
            </Field>
          </div>
        </section>
      )}

      {message && (
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-white/70">
          <CheckCircle2 className="h-5 w-5 text-[#72A3BF]" />
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={saving || uploading}
        className="h-16 w-full rounded-2xl bg-[#72A3BF] text-black font-semibold disabled:opacity-60"
      >
        {saving ? "Salvando..." : "Salvar imóvel"}
      </button>
    </form>
  );
}

function Field({
  label,
  help,
  children,
  className = "",
}: {
  label: string;
  help: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-semibold text-white/80">{label}</span>
      <span className="mt-1 mb-3 block text-xs text-white/40">{help}</span>
      {children}
    </label>
  );
}

export default PropertyForm;

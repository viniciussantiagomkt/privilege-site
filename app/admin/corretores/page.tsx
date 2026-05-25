"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { Broker } from "@/types/property";

type BrokerForm = {
  name: string;
  email: string;
  password: string;
  phone: string;
  whatsapp: string;
  creci: string;
  instagram: string;
  position: string;
  bio: string;
  avatar_url: string;
};

const emptyForm: BrokerForm = {
  name: "",
  email: "",
  password: "",
  phone: "",
  whatsapp: "",
  creci: "",
  instagram: "",
  position: "",
  bio: "",
  avatar_url: "",
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function AdminBrokersPage() {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [form, setForm] = useState<BrokerForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadBrokers();
  }, []);

  async function loadBrokers() {
    const { data } = await supabase
      .from("brokers")
      .select("*")
      .order("name", { ascending: true });

    setBrokers((data || []) as Broker[]);
  }

  function updateField(field: keyof BrokerForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function editBroker(broker: Broker) {
    setEditingId(broker.id);
    setForm({
      name: broker.name || "",
      email: broker.email || "",
      password: "",
      phone: broker.phone || "",
      whatsapp: broker.whatsapp || "",
      creci: broker.creci || "",
      instagram: broker.instagram || "",
      position: broker.position || broker.role_title || "",
      bio: broker.bio || "",
      avatar_url: broker.avatar_url || "",
    });
    setMessage("");
  }

  async function uploadAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const folder = slugify(form.email || form.name || "corretor");
    const path = `${folder}/${Date.now()}-${slugify(file.name)}`;
    const { error } = await supabase.storage
      .from("agent-avatars")
      .upload(path, file, {
        cacheControl: "31536000",
        upsert: true,
      });

    if (error) {
      setMessage(error.message);
      return;
    }

    const { data } = supabase.storage.from("agent-avatars").getPublicUrl(path);
    updateField("avatar_url", data.publicUrl);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    if (editingId) {
      const { error } = await supabase
        .from("brokers")
        .update({
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          whatsapp: form.whatsapp || null,
          creci: form.creci || null,
          instagram: form.instagram || null,
          position: form.position || null,
          role_title: form.position || null,
          bio: form.bio || null,
          avatar_url: form.avatar_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId);

      setSaving(false);

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Corretor atualizado.");
      setEditingId(null);
      setForm(emptyForm);
      await loadBrokers();
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch("/api/admin/brokers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}),
      },
      body: JSON.stringify(form),
    });

    const result = (await response.json().catch(() => null)) as
      | { error?: string; temporary_password?: string }
      | null;

    setSaving(false);

    if (!response.ok) {
      setMessage(result?.error || "Nao foi possivel criar o corretor.");
      return;
    }

    setMessage(
      result?.temporary_password
        ? `Corretor criado. Senha temporaria: ${result.temporary_password}`
        : "Corretor criado."
    );
    setForm(emptyForm);
    await loadBrokers();
  }

  async function deactivateBroker(id: string) {
    const { error } = await supabase
      .from("brokers")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadBrokers();
  }

  return (
    <main className="admin-editorial min-h-screen bg-[#E0E8E6] px-4 py-8 text-[#030F18] md:px-8">
      <div className="mx-auto max-w-7xl">
        <a href="/admin" className="text-sm text-[#446E87] transition hover:text-[#1D4052]">
          Voltar ao dashboard
        </a>

        <div className="mt-8">
          <span className="text-xs uppercase tracking-[0.28em] text-[#446E87]">
            Equipe
          </span>
          <h1 className="mt-3 text-[clamp(2.4rem,10vw,4.5rem)] font-bold">
            Corretores
          </h1>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <form
            onSubmit={handleSubmit}
            className="rounded-[28px] border border-[#446E87]/14 bg-[#D7E1DF]/60 p-5 shadow-[0_20px_70px_rgba(3,15,24,0.05)] md:p-6"
          >
            <h2 className="text-2xl font-semibold">
              {editingId ? "Editar corretor" : "Novo corretor"}
            </h2>

            <div className="mt-6 grid gap-4">
              <input className="admin-input" placeholder="Nome" value={form.name} onChange={(e) => updateField("name", e.target.value)} required />
              <input className="admin-input" placeholder="Email" type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} required />
              {!editingId && (
                <input className="admin-input" placeholder="Senha inicial opcional" type="password" value={form.password} onChange={(e) => updateField("password", e.target.value)} />
              )}
              <input className="admin-input" placeholder="Cargo / especialidade" value={form.position} onChange={(e) => updateField("position", e.target.value)} />
              <input className="admin-input" placeholder="CRECI" value={form.creci} onChange={(e) => updateField("creci", e.target.value)} />
              <input className="admin-input" placeholder="WhatsApp" value={form.whatsapp} onChange={(e) => updateField("whatsapp", e.target.value)} />
              <input className="admin-input" placeholder="Telefone" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
              <input className="admin-input" placeholder="Instagram" value={form.instagram} onChange={(e) => updateField("instagram", e.target.value)} />

              <label className="rounded-2xl border border-[#446E87]/14 bg-[#E0E8E6]/60 p-4">
                <span className="text-sm text-[#030F18]/60">Avatar</span>
                <input type="file" accept="image/*" onChange={uploadAvatar} className="mt-3 block w-full text-sm" />
              </label>

              {form.avatar_url && (
                <img
                  src={form.avatar_url}
                  alt=""
                  className="h-32 w-32 rounded-2xl object-cover"
                />
              )}

              <textarea
                className="admin-input min-h-28 p-5"
                placeholder="Bio profissional"
                value={form.bio}
                onChange={(e) => updateField("bio", e.target.value)}
              />
            </div>

            {message && <p className="mt-5 text-sm text-[#030F18]/62">{message}</p>}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyForm);
                  }}
                  className="h-12 rounded-2xl border border-[#1D4052]/18"
                >
                  Cancelar
                </button>
              )}
              <button className="h-12 rounded-2xl bg-[#1D4052] text-[#E0E8E6] disabled:opacity-60" disabled={saving}>
                {saving ? "Salvando..." : editingId ? "Salvar" : "Criar corretor"}
              </button>
            </div>
          </form>

          <section className="grid gap-4">
            {brokers.map((broker) => (
              <article
                key={broker.id}
                className="rounded-[28px] border border-[#446E87]/14 bg-[#D7E1DF]/60 p-5 md:p-6"
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                  <img
                    src={broker.avatar_url || "/brand/symbol-blue.png"}
                    alt={broker.name || "Corretor"}
                    className="h-24 w-24 rounded-3xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-semibold">{broker.name || broker.email}</h2>
                    <p className="mt-1 text-[#030F18]/56">{broker.position || broker.role_title || "Corretor Privilege"}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.22em] text-[#446E87]">
                      {broker.creci || "CRECI nao informado"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-[#030F18]/58">
                      {broker.whatsapp && <span>{broker.whatsapp}</span>}
                      {broker.instagram && <span>{broker.instagram}</span>}
                      {!broker.active && <span className="text-red-600">Inativo</span>}
                    </div>
                  </div>
                  <div className="grid gap-2 sm:w-36">
                    <button
                      onClick={() => editBroker(broker)}
                      className="h-11 rounded-full border border-[#1D4052]/18"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deactivateBroker(broker.id)}
                      className="h-11 rounded-full bg-red-500/10 text-red-700"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}

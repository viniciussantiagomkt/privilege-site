"use client";

import { FormEvent, useState } from "react";

import { trackEvent } from "@/lib/analytics";

interface LeadFormProps {
  propertyId?: number;
  propertyTitle?: string;
  propertySlug?: string;
  source?: string;
  whatsappNumber?: string;
}

export function LeadForm({
  propertyId,
  propertyTitle,
  propertySlug,
  source = "site",
  whatsappNumber,
}: LeadFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [leadMessage, setLeadMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const payload = {
      name,
      phone,
      email,
      source,
      property_id: propertyId ?? null,
      property_title: propertyTitle ?? null,
      property_slug: propertySlug ?? null,
      status: "novo",
      page_path: window.location.pathname,
      origin_detail: document.referrer || null,
      message: leadMessage,
      whatsapp_number: whatsappNumber,
    };

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = (await response.json().catch(() => null)) as {
      whatsapp_url?: string;
      error?: string;
    } | null;

    setLoading(false);

    if (!response.ok) {
      setMessage(
        result?.error ||
          "Nao foi possivel enviar agora. Tente novamente em instantes."
      );
      return;
    }

    setName("");
    setPhone("");
    setEmail("");
    setLeadMessage("");
    setMessage("Abrindo atendimento no WhatsApp.");
    trackEvent("lead", {
      source,
      property_id: propertyId ?? null,
      property_slug: propertySlug ?? null,
    });

    if (result?.whatsapp_url) {
      window.location.href = result.whatsapp_url;
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-[28px] border border-[#446E87]/14 bg-[#D7E1DF]/55 p-6 shadow-[0_24px_80px_rgba(3,15,24,0.06)] md:gap-5 md:rounded-[32px] md:p-8"
    >
      <h2 className="text-2xl font-bold text-[#1D4052] md:text-3xl">
        Solicite atendimento
      </h2>

      {propertyTitle && (
        <p className="text-sm text-[#030F18]/50">
          Interesse em: {propertyTitle}
        </p>
      )}

      <input
        placeholder="Seu nome"
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="h-14 rounded-2xl border border-[#446E87]/12 bg-[#E0E8E6]/70 px-5 text-[#030F18] outline-none placeholder:text-[#030F18]/35 md:h-16 md:px-6"
        required
      />

      <textarea
        placeholder="Conte brevemente o que voce procura"
        value={leadMessage}
        onChange={(event) => setLeadMessage(event.target.value)}
        className="min-h-28 rounded-2xl border border-[#446E87]/12 bg-[#E0E8E6]/70 px-5 py-5 text-[#030F18] outline-none placeholder:text-[#030F18]/35 md:px-6"
      />

      <input
        placeholder="Seu WhatsApp"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        className="h-14 rounded-2xl border border-[#446E87]/12 bg-[#E0E8E6]/70 px-5 text-[#030F18] outline-none placeholder:text-[#030F18]/35 md:h-16 md:px-6"
        required
      />

      <input
        type="email"
        placeholder="Seu email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="h-14 rounded-2xl border border-[#446E87]/12 bg-[#E0E8E6]/70 px-5 text-[#030F18] outline-none placeholder:text-[#030F18]/35 md:h-16 md:px-6"
      />

      {message && (
        <p className="text-sm text-[#030F18]/60">
          {message}
        </p>
      )}

      <button className="h-14 rounded-2xl border border-[#1D4052] bg-[#1D4052] text-[#E0E8E6] shadow-[0_18px_50px_rgba(29,64,82,0.14)] transition duration-500 hover:border-[#446E87] hover:bg-[#446E87] md:h-16">
        {loading
          ? "Enviando..."
          : "Falar com especialista"}
      </button>
    </form>
  );
}

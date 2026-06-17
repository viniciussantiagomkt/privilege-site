"use client";

import { FormEvent, useState } from "react";

import { trackEvent } from "@/lib/analytics";

const propertyGoals = [
  "Apartamento",
  "Casa",
  "Condomínio",
  "Investimento",
  "Minha Casa Minha Vida",
];

const budgetRanges = [
  "Até 300 mil",
  "300 a 600 mil",
  "600 mil a 1 milhão",
  "+1 milhão",
];

export function LinksLeadForm() {
  const [goal, setGoal] = useState(propertyGoals[0]);
  const [budget, setBudget] = useState(budgetRanges[1]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const leadMessage = `Estou procurando: ${goal}. Valor: ${budget}.`;

    const response = await fetch("/api/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        phone,
        email: null,
        message: leadMessage,
        source: "central-digital",
        page_path: window.location.pathname,
        origin_detail: document.referrer || null,
      }),
    });

    const result = (await response.json().catch(() => null)) as {
      whatsapp_url?: string;
      error?: string;
    } | null;

    setLoading(false);

    if (!response.ok) {
      setMessage(
        result?.error ||
          "Não foi possível registrar seu atendimento agora. Tente novamente."
      );
      return;
    }

    trackEvent("lead", {
      source: "central-digital",
      interest: goal,
      budget,
    });

    setMessage("Abrindo atendimento no WhatsApp.");

    if (result?.whatsapp_url) {
      window.location.href = result.whatsapp_url;
    }
  }

  return (
    <form
      id="encontrar-imovel"
      onSubmit={handleSubmit}
      className="rounded-[30px] border border-[#446E87]/14 bg-[#D7E1DF]/58 p-5 shadow-[0_24px_80px_rgba(3,15,24,0.06)] backdrop-blur-xl sm:p-7"
    >
      <span className="text-xs uppercase tracking-[0.28em] text-[#446E87]">
        Atendimento guiado
      </span>

      <h2 className="mt-4 text-2xl font-semibold leading-tight text-[#1D4052] sm:text-3xl">
        Encontre o imóvel certo para o seu momento.
      </h2>

      <div className="mt-7 grid gap-5">
        <fieldset>
          <legend className="mb-3 text-sm font-medium text-[#030F18]/70">
            Estou procurando
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {propertyGoals.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setGoal(item)}
                className={`min-h-12 rounded-2xl border px-4 text-left text-sm transition duration-500 ${
                  goal === item
                    ? "border-[#1D4052] bg-[#1D4052] text-[#E0E8E6]"
                    : "border-[#446E87]/14 bg-[#E0E8E6]/58 text-[#030F18]/68 hover:border-[#1D4052]/40 hover:bg-white/35"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-sm font-medium text-[#030F18]/70">
            Faixa de valor
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {budgetRanges.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setBudget(item)}
                className={`min-h-12 rounded-2xl border px-4 text-left text-sm transition duration-500 ${
                  budget === item
                    ? "border-[#1D4052] bg-[#1D4052] text-[#E0E8E6]"
                    : "border-[#446E87]/14 bg-[#E0E8E6]/58 text-[#030F18]/68 hover:border-[#1D4052]/40 hover:bg-white/35"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </fieldset>

        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Seu nome"
          required
          className="h-14 rounded-2xl border border-[#446E87]/14 bg-[#E0E8E6]/64 px-5 text-[#030F18] outline-none transition duration-500 placeholder:text-[#030F18]/35 focus:border-[#1D4052]/45"
        />

        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="Seu WhatsApp"
          required
          className="h-14 rounded-2xl border border-[#446E87]/14 bg-[#E0E8E6]/64 px-5 text-[#030F18] outline-none transition duration-500 placeholder:text-[#030F18]/35 focus:border-[#1D4052]/45"
        />

        {message && <p className="text-sm text-[#030F18]/58">{message}</p>}

        <button
          type="submit"
          className="min-h-14 rounded-2xl border border-[#1D4052] bg-[#1D4052] px-6 text-sm font-medium text-[#E0E8E6] shadow-[0_18px_60px_rgba(29,64,82,0.18)] transition duration-500 hover:border-[#446E87] hover:bg-[#446E87] disabled:cursor-wait disabled:opacity-70"
          disabled={loading}
        >
          {loading ? "Enviando..." : "Receber atendimento Privilege"}
        </button>
      </div>
    </form>
  );
}

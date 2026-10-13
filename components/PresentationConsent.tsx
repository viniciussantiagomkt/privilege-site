"use client";
import { useRef, useState } from "react";
export function PresentationConsent({ token }: { token: string }) {
  const [state, setState] = useState("idle");
  const nonce = useRef<string | null>(null);
  async function consent() {
    setState("saving");
    nonce.current ||= crypto.randomUUID();
    try {
      const r = await fetch("/api/presentation-open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, nonce: nonce.current, consented: true }),
      });
      const data = await r.json();
      setState(r.ok && data.recorded ? "done" : "error");
    } catch {
      setState("error");
    }
  }
  return (
    <div className="presentation-consent">
      <p>
        Você pode autorizar o registro desta abertura para ajudar o corretor a
        acompanhar seu interesse. Nenhum dado pessoal é necessário.
      </p>
      {state === "done" ? (
        <p role="status">Abertura registrada. Obrigado!</p>
      ) : (
        <button onClick={() => void consent()} disabled={state === "saving"}>
          {state === "saving"
            ? "Registrando..."
            : "Autorizar registro da abertura"}
        </button>
      )}
      {state === "error" && (
        <p role="alert">
          Não foi possível registrar. Você pode continuar consultando a
          apresentação.
        </p>
      )}
    </div>
  );
}

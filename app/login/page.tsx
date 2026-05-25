"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert("Credenciais invalidas");
      return;
    }

    router.push("/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-[#030F18]">
      <div className="w-full max-w-md rounded-[32px] border border-[#446E87]/14 bg-[#D7E1DF]/60 p-10 shadow-[0_24px_80px_rgba(3,15,24,0.08)] backdrop-blur-2xl">
        <img
          src="/brand/logo-vertical-blue.png"
          alt="Privilege Imoveis"
          className="mx-auto h-28 w-36 object-contain"
        />

        <h1 className="mt-8 text-4xl font-bold">Login Administrativo</h1>

        <form onSubmit={handleLogin} className="mt-10 flex flex-col gap-6">
          <input
            type="email"
            placeholder="Seu email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-16 rounded-2xl border border-[#446E87]/14 bg-[#E0E8E6]/70 px-6 outline-none"
          />

          <input
            type="password"
            placeholder="Sua senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-16 rounded-2xl border border-[#446E87]/14 bg-[#E0E8E6]/70 px-6 outline-none"
          />

          <button className="h-16 rounded-2xl border border-[#030F18]/18 text-[#030F18]/76 transition duration-500 hover:border-[#446E87]/45 hover:bg-white/35">
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}

"use client";

import Image from "next/image";
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
      alert("Credenciais inválidas");
      return;
    }

    router.push("/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-[#030F18]">
      <div className="w-full max-w-md rounded-[32px] border border-[#446E87]/14 bg-[#D7E1DF]/60 p-8 shadow-[0_24px_80px_rgba(3,15,24,0.08)] backdrop-blur-2xl md:p-10">
        <Image
          src="/brand/logo-vertical-blue.png"
          alt="Privilege Imóveis"
          width={144}
          height={112}
          priority
          className="mx-auto h-28 w-36 object-contain"
        />

        <h1 className="mt-8 text-4xl font-bold">Login administrativo</h1>

        <form onSubmit={handleLogin} className="mt-10 flex flex-col gap-6">
          <input
            type="email"
            placeholder="Seu e-mail"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-16 rounded-2xl border border-[#446E87]/14 bg-[#E0E8E6]/70 px-6 outline-none transition duration-500 focus:border-[#446E87]/48"
          />

          <input
            type="password"
            placeholder="Sua senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-16 rounded-2xl border border-[#446E87]/14 bg-[#E0E8E6]/70 px-6 outline-none transition duration-500 focus:border-[#446E87]/48"
          />

          <button className="h-16 rounded-2xl border border-[#030F18]/18 text-[#030F18]/76 transition duration-500 hover:border-[#446E87]/45 hover:bg-white/35">
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}

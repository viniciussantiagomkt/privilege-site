"use client";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setError(
          error.code === "email_not_confirmed"
            ? "Confirme o e-mail da sua conta antes de entrar."
            : "Não foi possível entrar. Confira seu e-mail e senha.",
        );
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError(
        "Não foi possível conectar. Verifique sua conexão e tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="crm-auth">
      <section className="crm-auth-story">
        <Image
          src="/brand/logo-horizontal-blue.png"
          alt="Privilege Imóveis"
          width={240}
          height={75}
          style={{
            filter: "brightness(0) invert(1)",
            objectFit: "contain",
            objectPosition: "left",
          }}
          priority
        />
        <h1>
          Mais conexões.
          <br />
          Novas oportunidades.
          <br />
          Grandes negócios.
        </h1>
        <p>
          Seu portfólio, seus clientes e sua próxima conquista. Tudo conectado
          no workspace Privilege.
        </p>
        <small>ONDE O PRIVILÉGIO TEM ENDEREÇO.</small>
      </section>
      <section className="crm-auth-form-area">
        <div className="crm-auth-card">
          <Image
            src="/brand/symbol-blue.png"
            alt="Privilege"
            width={46}
            height={46}
          />
          <p className="crm-eyebrow" style={{ marginTop: 20 }}>
            WORKSPACE PRIVILEGE
          </p>
          <h2>Bem-vindo de volta.</h2>
          <p>Acesse sua conta e continue de onde parou.</p>
          <form onSubmit={login}>
            <label htmlFor="email">
              E-mail
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                disabled={loading}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Seu e-mail profissional"
              />
            </label>
            <label htmlFor="password">
              Senha
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                disabled={loading}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
              />
            </label>
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
            <button disabled={loading} type="submit">
              {loading ? "Entrando no workspace..." : "Entrar no workspace"}{" "}
              <ArrowUpRight
                size={15}
                style={{
                  display: "inline",
                  verticalAlign: "middle",
                  marginLeft: 9,
                }}
              />
            </button>
          </form>
          <small>
            <ShieldCheck
              size={14}
              style={{
                display: "inline",
                verticalAlign: "middle",
                marginRight: 5,
              }}
            />
            Acesso individual e seguro. Se precisar recuperar sua conta, procure
            a administração da Privilege.
          </small>
        </div>
      </section>
    </main>
  );
}

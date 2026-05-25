import { Camera } from "lucide-react";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { createServerClient } from "@/lib/supabase-server";
import { Broker } from "@/types/property";

const fallbackAgents: Broker[] = [
  {
    id: "carlos-mendes",
    name: "Carlos Mendes",
    position: "Especialista Alto Padrao",
    creci: "CRECI 839J",
    instagram: "https://instagram.com/privilegeimoveis",
    whatsapp: "5583999999999",
    avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
  },
  {
    id: "fernanda-alves",
    name: "Fernanda Alves",
    position: "Consultora Imobiliaria",
    creci: "CRECI 839J",
    instagram: "https://instagram.com/privilegeimoveis",
    whatsapp: "5583999999999",
    avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
  },
  {
    id: "marina-duarte",
    name: "Marina Duarte",
    position: "Curadora de Imoveis Premium",
    creci: "CRECI 839J",
    instagram: "https://instagram.com/privilegeimoveis",
    whatsapp: "5583999999999",
    avatar_url: "https://images.unsplash.com/photo-1580489944761-15a19d654956",
  },
  {
    id: "rafael-nogueira",
    name: "Rafael Nogueira",
    position: "Consultor de Patrimonio Imobiliario",
    creci: "CRECI 839J",
    instagram: "https://instagram.com/privilegeimoveis",
    whatsapp: "5583999999999",
    avatar_url: "https://images.unsplash.com/photo-1560250097-0b93528c311a",
  },
];

export default async function AgentsPage() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("brokers")
    .select("*")
    .eq("active", true)
    .order("name", { ascending: true });
  const agents = ((data || []) as Broker[]).length ? ((data || []) as Broker[]) : fallbackAgents;

  return (
    <main className="text-[#030F18]">
      <Navbar />

      <section className="px-5 pb-20 pt-32 md:px-6 md:pb-24 md:pt-40">
        <div className="mx-auto max-w-7xl">
          <span className="text-xs uppercase tracking-[0.28em] text-[#446E87] md:text-sm md:tracking-[0.3em]">
            Corretores
          </span>

          <h1 className="mt-5 text-[clamp(2.8rem,13vw,4.5rem)] font-bold leading-[1.02] md:mt-6">
            Especialistas Privilege.
          </h1>

          <div className="mt-12 grid grid-cols-1 gap-6 md:mt-20 md:grid-cols-2 md:gap-10">
            {agents.map((agent) => {
              const whatsapp = (agent.whatsapp || agent.phone || "5583999999999").replace(/\D/g, "");

              return (
                <div
                  key={agent.id}
                  className="group overflow-hidden rounded-[32px] border border-[#446E87]/14 bg-[#D7E1DF]/55 shadow-[0_24px_80px_rgba(3,15,24,0.06)] transition duration-700 hover:-translate-y-1 hover:border-[#446E87]/24 hover:shadow-[0_30px_90px_rgba(3,15,24,0.09)]"
                >
                  <img
                    src={agent.avatar_url || "/brand/symbol-blue.png"}
                    alt={agent.name || "Corretor Privilege"}
                    className="aspect-[4/5] h-auto w-full object-cover transition duration-1000 group-hover:scale-[1.025] md:h-[500px] md:aspect-auto"
                  />

                  <div className="p-6 md:p-8">
                    <h2 className="text-2xl font-semibold md:text-3xl">{agent.name}</h2>
                    <p className="mt-3 text-[#030F18]/52">
                      {agent.position || agent.role_title || "Corretor Privilege"}
                    </p>
                    <p className="mt-3 text-xs uppercase tracking-[0.24em] text-[#446E87]">
                      {agent.creci || "CRECI 839J"}
                    </p>

                    <div className="mt-7 flex items-center gap-3 md:mt-8">
                      <a
                        href={`https://wa.me/${whatsapp}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-h-12 flex-1 items-center justify-center rounded-full border border-[#25D366] bg-[#25D366] px-5 py-3 text-white shadow-[0_18px_50px_rgba(37,211,102,0.16)] transition duration-500 hover:border-[#1FB857] hover:bg-[#1FB857] sm:flex-none md:px-6 md:py-4"
                      >
                        Falar no WhatsApp
                      </a>

                      {agent.instagram && (
                        <a
                          href={agent.instagram}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Instagram de ${agent.name}`}
                          className="flex h-14 w-14 items-center justify-center rounded-full border border-[#1D4052]/12 bg-transparent text-[#1D4052] transition duration-500 hover:-translate-y-1 hover:border-[#1D4052] hover:bg-[#1D4052] hover:text-[#E0E8E6]"
                        >
                          <Camera className="h-5 w-5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

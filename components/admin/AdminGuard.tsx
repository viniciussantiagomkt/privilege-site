"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({
  children,
}: AdminGuardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;

    async function validateSession() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (error || !user) {
        setAuthorized(false);
        router.replace("/login");
        return;
      }

      const { data: role, error: roleError } = await supabase.rpc("current_user_role");
      if (!active) return;
      if (roleError || !["admin", "manager", "broker", "corretor"].includes(role)) {
        setAuthorized(false);
        setLoading(false);
        return;
      }
      setAuthorized(true);
      setLoading(false);
    }

    validateSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setAuthorized(false);
        router.replace("/login");
      } else {
        queueMicrotask(() => { void validateSession(); });
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#030F18] text-white flex items-center justify-center">
        <div className="h-16 w-16 rounded-full border-4 border-[#72A3BF]/20 border-t-[#72A3BF] animate-spin" />
      </main>
    );
  }

  if (!authorized) {
    return <main className="min-h-screen flex items-center justify-center">Sua conta não tem acesso ao CRM.</main>;
  }

  return <>{children}</>;
}

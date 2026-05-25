"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

interface AdminGuardProps {
  children: React.ReactNode;
}

export type AdminRole = "admin" | "corretor";

export function getUserRole(session: Session | null): AdminRole {
  const role = session?.user.user_metadata?.role;

  return role === "admin" ? "admin" : "corretor";
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
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      if (!session) {
        router.replace("/login");
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
        router.replace("/login");
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
    return null;
  }

  return <>{children}</>;
}

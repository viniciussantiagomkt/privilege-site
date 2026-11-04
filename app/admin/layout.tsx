import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { WorkspaceProvider } from "@/components/crm/Workspace";
import { CrmShell } from "@/components/crm/Shell";
import "./crm.css";
export const metadata: Metadata = {
  title: "CRM | Privilege Imóveis",
  robots: { index: false, follow: false },
};
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <Suspense fallback={<p role="status">Carregando o espaço de trabalho…</p>}>
      <WorkspaceProvider>
        <CrmShell>{children}</CrmShell>
      </WorkspaceProvider>
      </Suspense>
    </AdminGuard>
  );
}

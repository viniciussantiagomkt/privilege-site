import type { Metadata } from "next";
import "../admin/crm.css";

export const metadata: Metadata = {
  title: "Login | Privilege Imóveis",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

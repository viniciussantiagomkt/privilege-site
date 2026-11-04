import { MessageCircle } from "lucide-react";
import { normalizeBrazilWhatsApp } from "@/lib/whatsapp";

export function ContactWhatsAppLink({
  phone,
}: {
  phone: string | null | undefined;
}) {
  if (!phone || !phone.replace(/\D/g, "")) return null;
  return (
    <a
      className="crm-button"
      href={`https://wa.me/${normalizeBrazilWhatsApp(phone)}`}
      target="_blank"
      rel="noreferrer"
    >
      <MessageCircle size={15} />
      WhatsApp
    </a>
  );
}

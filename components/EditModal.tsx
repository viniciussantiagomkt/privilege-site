"use client";

import { PropertyForm } from "./PropertyForm";
import { Property } from "@/types/property";

interface EditModalProps {
  property: Property | null;
  open: boolean;
  onClose: () => void;
  onSaved?: (property: Property) => void;
}

export function EditModal({
  property,
  open,
  onClose,
  onSaved,
}: EditModalProps) {
  if (!open || !property) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 p-3 md:p-6">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[26px] border border-white/10 bg-[#030F18] p-5 md:rounded-[32px] md:p-10">
        <div className="mb-8 flex items-center justify-between gap-4 md:mb-10">
          <h2 className="text-2xl font-bold md:text-3xl">
            Editar imovel
          </h2>

          <button
            onClick={onClose}
            className="min-h-10 rounded-full border border-white/10 px-4 text-white/50 hover:text-white"
          >
            Fechar
          </button>
        </div>

        <PropertyForm
          key={property.id}
          initialData={property}
          onSaved={onSaved}
        />
      </div>
    </div>
  );
}

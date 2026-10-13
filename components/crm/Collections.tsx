"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useWorkspace } from "./Workspace";
import {
  Modal,
  Button,
  EntityForm,
  Empty,
  text,
  optional,
  numberId,
} from "./UI";
export function Collections({ onClose }: { onClose: () => void }) {
  const ctx = useWorkspace();
  const [selected, setSelected] = useState("");
  const collection = ctx.data.marketing_collections.find(
    (c) => c.id === Number(selected),
  );
  const items = ctx.data.marketing_collection_items.filter(
    (i) => i.collection_id === collection?.id,
  );
  return (
    <Modal
      title="Minhas coleções e kits"
      description="Organize materiais e imóveis para seus atendimentos e campanhas."
      onClose={onClose}
      wide
    >
      <label className="crm-form">
        Coleção
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Selecione</option>
          {ctx.data.marketing_collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {collection ? (
        <>
          <EntityForm
            key={collection.id}
            fields={[
              {
                name: "name",
                label: "Nome",
                required: true,
                value: collection.name,
              },
              {
                name: "description",
                label: "Descrição",
                type: "textarea",
                value: collection.description,
              },
            ]}
            onClose={onClose}
            onSubmit={(f) =>
              ctx.run(() =>
                supabase
                  .from("marketing_collections")
                  .update({
                    name: text(f, "name"),
                    description: optional(f, "description"),
                  })
                  .eq("id", collection.id)
                  .select("id")
                  .single(),
              )
            }
          />
          {items.map((i) => (
            <div className="crm-notification-row" key={i.id}>
              <span>
                {i.asset_id
                  ? ctx.data.marketing_assets.find((a) => a.id === i.asset_id)
                      ?.title
                  : ctx.data.properties.find((p) => p.id === i.property_id)
                      ?.title}
              </span>
              <Button
                secondary
                disabled={ctx.busy}
                onClick={() =>
                  void ctx.run(() =>
                    supabase
                      .from("marketing_collection_items")
                      .delete()
                      .eq("id", i.id)
                      .select("id")
                      .single(),
                  )
                }
              >
                Retirar do kit
              </Button>
            </div>
          ))}
          {!items.length && (
            <Empty
              title="Sua coleção ainda está vazia"
              description="Adicione materiais ou imóveis abaixo."
            />
          )}
          <EntityForm
            fields={[
              {
                name: "asset",
                label: "Material",
                options: ctx.data.marketing_assets.map((a) => ({
                  value: a.id,
                  label: a.title,
                })),
              },
              {
                name: "property",
                label: "Imóvel",
                options: ctx.data.properties.map((p) => ({
                  value: p.id,
                  label: `${p.property_code} · ${p.title}`,
                })),
              },
            ]}
            onClose={onClose}
            onSubmit={(f) =>
              ctx.run(async () => {
                const asset_id = numberId(f, "asset"),
                  property_id = numberId(f, "property");
                if ((!asset_id && !property_id) || (asset_id && property_id))
                  return {
                    error: {
                      message: "Escolha um material ou um imóvel de cada vez.",
                    },
                  };
                return await supabase
                  .from("marketing_collection_items")
                  .insert({
                    collection_id: collection.id,
                    asset_id,
                    property_id,
                  });
              })
            }
          />
        </>
      ) : (
        <Empty
          title="Escolha uma coleção"
          description="Crie novas coleções na Central de Marketing e organize seus kits aqui."
        />
      )}
    </Modal>
  );
}

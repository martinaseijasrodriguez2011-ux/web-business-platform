"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Alert, Field, Input } from "@/components/ui/form";

export function ProfileForm({ phone, avatarPath, staffId }: { phone: string | null; avatarPath: string | null; staffId: string }) {
  const router = useRouter();
  const [tel, setTel] = useState(phone ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true); setMsg(null);
    const supabase = createClient();
    let path = avatarPath;
    if (file) {
      if (!file.type.startsWith("image/") || file.size > 3 * 1024 * 1024) { setMsg({ ok: false, text: "La fotografía debe ser una imagen de menos de 3 MB." }); setBusy(false); return; }
      path = `avatares/${staffId}-${Date.now()}.${file.name.split(".").pop()?.toLowerCase() ?? "jpg"}`;
      const up = await supabase.storage.from("corporativo").upload(path, file, { contentType: file.type });
      if (up.error) { setMsg({ ok: false, text: "No se pudo subir la fotografía." }); setBusy(false); return; }
    }
    const { error } = await supabase.rpc("update_my_profile", { p_phone: tel, p_avatar_path: path ?? "" });
    setBusy(false);
    if (error) setMsg({ ok: false, text: "No se pudieron guardar los cambios." });
    else { setMsg({ ok: true, text: "Datos actualizados." }); router.refresh(); }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Teléfono" htmlFor="phone"><Input id="phone" type="tel" value={tel} onChange={(e) => setTel(e.target.value)} /></Field>
        <Field label="Fotografía (opcional)" htmlFor="avatar"><input id="avatar" type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-brand" /></Field>
      </div>
      {msg && <Alert tone={msg.ok ? "verde" : "rojo"}>{msg.text}</Alert>}
      <div className="flex justify-end"><Button onClick={save} disabled={busy}>{busy ? "Guardando…" : "Guardar"}</Button></div>
    </div>
  );
}

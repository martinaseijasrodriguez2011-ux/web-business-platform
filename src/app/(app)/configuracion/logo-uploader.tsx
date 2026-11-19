"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/form";
import { setLogoPath } from "./actions";

/** El logotipo oficial se sube tal cual, sin modificarlo. */
export function LogoUploader({ current }: { current: string | null }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function upload() {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/svg+xml", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) { setMsg({ ok: false, text: "Formato admitido: PNG, JPG, SVG o WebP (máx. 5 MB)." }); return; }
    setBusy(true);
    const path = `logo/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const up = await createClient().storage.from("corporativo").upload(path, file, { contentType: file.type });
    if (up.error) { setMsg({ ok: false, text: "No se pudo subir el logotipo." }); setBusy(false); return; }
    const r = await setLogoPath(path);
    setBusy(false); setMsg({ ok: r.ok, text: r.message ?? r.error ?? "" }); router.refresh();
  }
  return (
    <div className="space-y-3">
      {current ? <img src={current} alt="Logotipo actual" className="h-16 max-w-[240px] rounded border border-line bg-white object-contain p-2" /> /* eslint-disable-line @next/next/no-img-element */
        : <div className="space-y-2"><img src="/brand/logo-altayo-rodriguez.jpg" alt="Logotipo oficial" className="h-16 rounded border border-line bg-white object-contain p-2" /><p className="text-sm text-ink-3">Se usa el logotipo oficial incluido en la aplicación. Puede sustituirlo por una versión de mayor calidad (SVG o PNG con fondo transparente).</p></div>} {/* eslint-disable-line @next/next/no-img-element */}
      <div className="flex flex-wrap items-center gap-3">
        <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:text-brand" />
        <Button onClick={upload} disabled={!file || busy} size="sm">{busy ? "Subiendo…" : "Subir logotipo"}</Button>
        {current && <Button variant="ghost" size="sm" onClick={async () => { const r = await setLogoPath(null); setMsg({ ok: r.ok, text: r.message ?? r.error ?? "" }); router.refresh(); }}>Quitar</Button>}
      </div>
      {msg && <Alert tone={msg.ok ? "verde" : "rojo"}>{msg.text}</Alert>}
    </div>
  );
}

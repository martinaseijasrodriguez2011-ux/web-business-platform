"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "./button";
import { cx } from "./cx";

/**
 * Ventana modal accesible basada en <dialog>. `trigger` abre la ventana;
 * `children` puede ser una función que recibe `close`.
 */
export function Modal({
  trigger, title, description, children, size = "md", triggerVariant = "secondary", triggerSize = "md", triggerClassName,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode | ((close: () => void) => React.ReactNode);
  size?: "sm" | "md" | "lg";
  triggerVariant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  triggerSize?: "sm" | "md";
  triggerClassName?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const close = () => setOpen(false);
  const width = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" }[size];

  return (
    <>
      <Button type="button" variant={triggerVariant} size={triggerSize} className={triggerClassName} onClick={() => setOpen(true)}>
        {trigger}
      </Button>
      <dialog
        ref={ref}
        onClose={close}
        className={cx("w-[calc(100%-2rem)] rounded-xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-black/30", width, "m-auto")}
      >
        {open && (
          <div className="flex max-h-[85vh] flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <h2 className="text-base font-semibold">{title}</h2>
                {description && <p className="mt-0.5 text-sm text-ink-3">{description}</p>}
              </div>
              <button type="button" onClick={close} className="rounded-md p-1 text-ink-3 hover:bg-gray-100" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">{typeof children === "function" ? children(close) : children}</div>
          </div>
        )}
      </dialog>
    </>
  );
}

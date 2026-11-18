import { cx } from "./cx";

const control =
  "w-full rounded-lg border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-3 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 disabled:bg-surface-2";

export function Field({ label, htmlFor, hint, required, children, className }: { label: string; htmlFor?: string; hint?: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink-2">
        {label} {required && <span className="text-[var(--rojo-fg)]" aria-hidden>*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

export function Input({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(control, "h-10", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(control, "min-h-24 py-2", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(control, "h-10 pr-8", className)} {...rest}>
      {children}
    </select>
  );
}

export function FormSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-b border-line px-5 py-5 last:border-b-0 md:grid-cols-[220px_1fr]">
      <div>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {description && <p className="mt-1 text-xs text-ink-3">{description}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

const alertTone = {
  rojo: "bg-[var(--rojo-bg)] text-[var(--rojo-fg)]",
  naranja: "bg-[var(--naranja-bg)] text-[var(--naranja-fg)]",
  verde: "bg-[var(--verde-bg)] text-[var(--verde-fg)]",
  azul: "bg-[var(--azul-bg)] text-[var(--azul-fg)]",
};

export function Alert({ tone = "rojo", children }: { tone?: keyof typeof alertTone; children: React.ReactNode }) {
  return (
    <div role={tone === "rojo" ? "alert" : "status"} className={cx("rounded-lg px-4 py-3 text-sm", alertTone[tone])}>
      {children}
    </div>
  );
}

import type { ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import type { Ref } from "@/lib/calc";

export function NativeSelect({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...p}
      className={cn(
        "h-9 w-full rounded-md border border-input bg-card px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      {children}
    </select>
  );
}

export function RefSelect({ refs, value, onChange, todos = "Todos", ...p }: { refs: Ref[]; value: string; onChange: (v: string) => void; todos?: string } & Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value">) {
  return (
    <NativeSelect value={value} onChange={(e) => onChange(e.target.value)} {...p}>
      <option value="">{todos}</option>
      {refs.map((r) => (
        <option key={r.id} value={r.id}>
          {r.nome}
        </option>
      ))}
    </NativeSelect>
  );
}

export function StatCard({ label, value, hint, tone = "default" }: { label: string; value: ReactNode; hint?: string; tone?: "default" | "primary" | "muted" }) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4 shadow-card",
        tone === "primary" ? "border-primary bg-primary text-primary-foreground" : "bg-card",
      )}
    >
      <p className={cn("text-xs font-medium uppercase tracking-wide", tone === "primary" ? "text-primary-foreground/80" : "text-muted-foreground")}>{label}</p>
      <p className="mt-2 font-serif text-3xl font-bold tabular-nums">{value}</p>
      {hint && <p className={cn("mt-1 text-xs", tone === "primary" ? "text-primary-foreground/75" : "text-muted-foreground")}>{hint}</p>}
    </div>
  );
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1 text-sm", className)}>
      <span className="font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

export function Panel({ title, children, actions, className }: { title?: string; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border bg-card p-4 shadow-card md:p-5", className)}>
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-bold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

import type { ReactNode } from "react";

type WidgetProps = {
  title: string;
  children?: ReactNode;
  className?: string;
};

export function Widget({ title, children, className = "" }: WidgetProps) {
  return (
    <section className={`rounded-xl border border-border bg-surface p-5 ${className}`}>
      <h2 className="mb-3 text-sm font-medium text-muted">{title}</h2>
      {children ?? <Placeholder />}
    </section>
  );
}

export function Placeholder({ text = "Скоро здесь будут данные" }: { text?: string }) {
  return (
    <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted">
      {text}
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </header>
  );
}

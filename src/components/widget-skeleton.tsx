// Заглушка, пока виджет загружает данные.
export function WidgetSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex animate-pulse flex-col gap-2" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-5 rounded-md bg-foreground/5" />
      ))}
    </div>
  );
}

import { Sidebar } from "@/components/sidebar";
import { SetupBanner } from "@/components/setup-banner";

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col md:flex-row">
      <aside className="border-b border-border p-4 md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="mb-4 hidden px-3 text-lg font-semibold md:block">Дашборд жизни</div>
        <Sidebar />
      </aside>
      <main className="flex-1 p-4 md:p-8">
        <SetupBanner />
        {children}
      </main>
    </div>
  );
}

import { Suspense } from "react";
import { PageHeader, Widget } from "@/components/widget";
import { WidgetSkeleton } from "@/components/widget-skeleton";
import { FinanceBoard } from "@/components/finance/sections";

export default function FinancePage({ searchParams }: PageProps<"/finance">) {
  return (
    <>
      <PageHeader title="Финансы" />
      <Suspense fallback={<FinanceSkeleton />}>
        <FinanceBoard searchParams={searchParams} />
      </Suspense>
    </>
  );
}

function FinanceSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <Widget title="Новая операция">
        <WidgetSkeleton rows={4} />
      </Widget>
      <Widget title="Счета">
        <WidgetSkeleton />
      </Widget>
      <Widget title="Месяц" className="sm:col-span-2 xl:col-span-1">
        <WidgetSkeleton rows={4} />
      </Widget>
      <Widget title="Операции" className="sm:col-span-2">
        <WidgetSkeleton rows={6} />
      </Widget>
    </div>
  );
}

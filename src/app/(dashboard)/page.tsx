import { Suspense } from "react";
import { PageHeader, Widget } from "@/components/widget";
import { WidgetSkeleton } from "@/components/widget-skeleton";
import {
  HabitsTodayWidget,
  StreaksWidget,
  TodayTasksWidget,
} from "@/components/planner/sections";

export default function HomePage() {
  return (
    <>
      <PageHeader title="Главная" subtitle="Сводка по всем сферам на сегодня" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Widget title="Задачи на сегодня">
          <Suspense fallback={<WidgetSkeleton />}>
            <TodayTasksWidget />
          </Suspense>
        </Widget>
        <Widget title="Привычки: прогресс дня">
          <Suspense fallback={<WidgetSkeleton />}>
            <HabitsTodayWidget />
          </Suspense>
        </Widget>
        <Widget title="Баланс по счетам" />
        <Widget title="Расходы за месяц" className="sm:col-span-2" />
        <Widget title="Серии привычек">
          <Suspense fallback={<WidgetSkeleton />}>
            <StreaksWidget />
          </Suspense>
        </Widget>
      </div>
    </>
  );
}

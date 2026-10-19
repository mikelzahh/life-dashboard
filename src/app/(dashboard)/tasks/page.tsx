import { Suspense } from "react";
import { PageHeader, Widget } from "@/components/widget";
import { WidgetSkeleton } from "@/components/widget-skeleton";
import { CalendarSection, HabitsSection, TasksSection } from "@/components/planner/sections";

export default function TasksPage() {
  return (
    <>
      <PageHeader title="Задачи и привычки" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Widget title="Задачи">
          <Suspense fallback={<WidgetSkeleton rows={5} />}>
            <TasksSection />
          </Suspense>
        </Widget>
        <Widget title="Привычки">
          <Suspense fallback={<WidgetSkeleton rows={5} />}>
            <HabitsSection />
          </Suspense>
        </Widget>
        <Widget title="Календарь выполнения" className="lg:col-span-2">
          <Suspense fallback={<WidgetSkeleton rows={2} />}>
            <CalendarSection />
          </Suspense>
        </Widget>
      </div>
    </>
  );
}

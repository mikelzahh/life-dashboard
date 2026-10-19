import { PageHeader, Widget } from "@/components/widget";

export default function TasksPage() {
  return (
    <>
      <PageHeader title="Задачи и привычки" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Widget title="Задачи" />
        <Widget title="Привычки" />
        <Widget title="Календарь выполнения" className="lg:col-span-2" />
      </div>
    </>
  );
}

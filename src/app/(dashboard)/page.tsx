import { PageHeader, Widget } from "@/components/widget";

export default function HomePage() {
  return (
    <>
      <PageHeader title="Главная" subtitle="Сводка по всем сферам на сегодня" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Widget title="Задачи на сегодня" />
        <Widget title="Привычки: прогресс дня" />
        <Widget title="Баланс по счетам" />
        <Widget title="Расходы за месяц" className="sm:col-span-2" />
        <Widget title="Серии привычек" />
      </div>
    </>
  );
}

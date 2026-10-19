import { PageHeader, Widget } from "@/components/widget";

export default function FinancePage() {
  return (
    <>
      <PageHeader title="Финансы" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Widget title="Счета" />
        <Widget title="Доходы за месяц" />
        <Widget title="Расходы за месяц" />
        <Widget title="Последние операции" className="sm:col-span-2 xl:col-span-3" />
      </div>
    </>
  );
}

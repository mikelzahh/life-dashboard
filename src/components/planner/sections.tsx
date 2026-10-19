import Link from "next/link";
import { getPlannerData, type PlannerData } from "@/lib/data/planner";
import { addDays, daysBetween, formatDay, plural, toLocalISO } from "@/lib/dates";
import { Placeholder } from "@/components/widget";
import { TaskForm } from "@/components/tasks/task-form";
import { TaskList } from "@/components/tasks/task-list";
import { HabitForm } from "@/components/habits/habit-form";
import { HabitGrid } from "@/components/habits/habit-grid";
import { HabitToday } from "@/components/habits/habit-today";

// Серверные блоки раздела «Задачи и привычки» и виджетов главной.
// Все читают сессию, поэтому на странице каждый стоит внутри <Suspense>.

const notConfigured = <Placeholder text="Подключите Supabase, чтобы здесь появились данные" />;

function doneToday(data: PlannerData) {
  return data.doneTasks.filter((t) => t.completed_at && toLocalISO(t.completed_at) === data.today);
}

// ---------------------------------------------------------------------------
// Раздел «Задачи и привычки»
// ---------------------------------------------------------------------------

export async function TasksSection() {
  const data = await getPlannerData();
  if (!data) return notConfigured;
  return (
    <>
      <TaskForm today={data.today} />
      <TaskList
        tasks={[...data.openTasks, ...doneToday(data)]}
        today={data.today}
        empty="Задач нет. Добавьте первую выше."
      />
    </>
  );
}

export async function HabitsSection() {
  const data = await getPlannerData();
  if (!data) return notConfigured;
  const days = daysBetween(addDays(data.today, -13), data.today);
  return (
    <>
      <HabitForm />
      <HabitGrid
        habits={data.habits}
        logs={data.logs.filter((l) => l.log_date >= days[0])}
        days={days}
        today={data.today}
      />
    </>
  );
}

const heatLevels = [
  "bg-foreground/5",
  "bg-accent/25",
  "bg-accent/45",
  "bg-accent/70",
  "bg-accent",
];

// Календарь активности: каждая клетка = день, цвет = сколько отметок
// привычек и выполненных задач было в этот день.
export async function CalendarSection() {
  const data = await getPlannerData();
  if (!data) return notConfigured;

  const habitIds = new Set(data.habits.map((h) => h.id));
  const marks = new Map<string, number>();
  for (const log of data.logs) {
    if (habitIds.has(log.habit_id)) marks.set(log.log_date, (marks.get(log.log_date) ?? 0) + 1);
  }
  const tasks = new Map<string, number>();
  for (const t of data.doneTasks) {
    if (!t.completed_at) continue;
    const day = toLocalISO(t.completed_at);
    tasks.set(day, (tasks.get(day) ?? 0) + 1);
  }

  const days = daysBetween(data.calendarFrom, data.today);
  const totalTasks = days.reduce((sum, d) => sum + (tasks.get(d) ?? 0), 0);
  const totalMarks = days.reduce((sum, d) => sum + (marks.get(d) ?? 0), 0);

  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div className="grid w-max grid-flow-col grid-rows-7 gap-1">
          {days.map((d) => {
            const m = marks.get(d) ?? 0;
            const t = tasks.get(d) ?? 0;
            const level = Math.min(m + t, heatLevels.length - 1);
            return (
              <div
                key={d}
                title={`${formatDay(d, { day: "numeric", month: "long" })}: ${m} ${plural(m, "отметка", "отметки", "отметок")}, ${t} ${plural(t, "задача", "задачи", "задач")}`}
                className={`size-3.5 rounded-sm ${heatLevels[level]} ${d === data.today ? "ring-1 ring-accent" : ""}`}
              />
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted">
        За {days.length} {plural(days.length, "день", "дня", "дней")}: {totalTasks}{" "}
        {plural(totalTasks, "задача выполнена", "задачи выполнено", "задач выполнено")}, {totalMarks}{" "}
        {plural(totalMarks, "отметка", "отметки", "отметок")} привычек.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Виджеты главной
// ---------------------------------------------------------------------------

export async function TodayTasksWidget() {
  const data = await getPlannerData();
  if (!data) return notConfigured;
  const due = data.openTasks.filter((t) => t.due_date && t.due_date <= data.today);
  const done = doneToday(data);
  return (
    <>
      <TaskList tasks={[...due, ...done]} today={data.today} empty="На сегодня задач нет" />
      <Link href="/tasks" className="mt-3 inline-block text-xs text-accent hover:underline">
        Все задачи →
      </Link>
    </>
  );
}

export async function HabitsTodayWidget() {
  const data = await getPlannerData();
  if (!data) return notConfigured;
  if (data.habits.length === 0) {
    return (
      <Link href="/tasks" className="block py-6 text-center text-sm text-muted hover:text-accent">
        Добавьте привычки в разделе «Задачи и привычки» →
      </Link>
    );
  }
  return (
    <HabitToday
      habits={data.habits}
      logs={data.logs.filter((l) => l.log_date === data.today)}
      today={data.today}
    />
  );
}

export async function StreaksWidget() {
  const data = await getPlannerData();
  if (!data) return notConfigured;
  const habits = [...data.habits].sort(
    (a, b) => b.stats.current - a.stats.current || b.stats.best - a.stats.best,
  );
  if (habits.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">Пока нет привычек</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {habits.map((h) => {
        const weekly = h.frequency === "weekly";
        const unit = (n: number) =>
          weekly ? plural(n, "неделя", "недели", "недель") : plural(n, "день", "дня", "дней");
        return (
          <li key={h.id} className="flex items-center gap-3 text-sm">
            <span className="min-w-0 flex-1 truncate">{h.name}</span>
            <span className={h.stats.current > 0 ? "font-medium" : "text-muted"}>
              {h.stats.current > 0 ? "🔥 " : ""}
              {h.stats.current} {unit(h.stats.current)}
            </span>
            <span className="w-20 shrink-0 text-right text-xs text-muted">рекорд {h.stats.best}</span>
          </li>
        );
      })}
    </ul>
  );
}

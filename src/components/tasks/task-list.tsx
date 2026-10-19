"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { Task } from "@/lib/supabase/database.types";
import { deleteTask, setTaskDone } from "@/app/(dashboard)/tasks/actions";
import { addDays, formatDay } from "@/lib/dates";

type Change = { id: string; done: boolean } | { id: string; deleted: true };

const priorityColor = ["", "bg-sky-500", "bg-amber-500", "bg-red-500"];
const priorityLabel = ["", "Низкий приоритет", "Средний приоритет", "Высокий приоритет"];

type Group = { title: string; tasks: Task[] };

function groupTasks(tasks: Task[], today: string): Group[] {
  const open = tasks.filter((t) => t.status !== "done");
  return [
    { title: "Просрочено", tasks: open.filter((t) => t.due_date && t.due_date < today) },
    { title: "Сегодня", tasks: open.filter((t) => t.due_date === today) },
    { title: "Позже", tasks: open.filter((t) => t.due_date && t.due_date > today) },
    { title: "Без срока", tasks: open.filter((t) => !t.due_date) },
    { title: "Выполнено сегодня", tasks: tasks.filter((t) => t.status === "done") },
  ].filter((g) => g.tasks.length > 0);
}

function dueLabel(due: string | null, today: string) {
  if (!due || due === today) return null;
  if (due === addDays(today, 1)) return "завтра";
  if (due === addDays(today, -1)) return "вчера";
  return formatDay(due, { day: "numeric", month: "short" });
}

// Список задач с мгновенными отметками: изменение видно сразу,
// а после ответа сервера страница перезагружает данные.
export function TaskList({
  tasks,
  today,
  empty = "Задач нет",
}: {
  tasks: Task[];
  today: string;
  empty?: string;
}) {
  const [optimistic, apply] = useOptimistic(tasks, (state, change: Change) =>
    "deleted" in change
      ? state.filter((t) => t.id !== change.id)
      : state.map((t) =>
          t.id === change.id ? { ...t, status: change.done ? "done" : "todo" } as Task : t,
        ),
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState("");

  function run(change: Change, action: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      apply(change);
      const result = await action();
      setError(result.error ?? "");
    });
  }

  const groups = groupTasks(optimistic, today);
  if (groups.length === 0) return <p className="py-6 text-center text-sm text-muted">{empty}</p>;

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-red-500">{error}</p>}
      {groups.map((group) => (
        <div key={group.title}>
          <h3
            className={`mb-1 text-xs font-medium uppercase tracking-wide ${
              group.title === "Просрочено" ? "text-red-500" : "text-muted"
            }`}
          >
            {group.title} · {group.tasks.length}
          </h3>
          <ul>
            {group.tasks.map((task) => {
              const isDone = task.status === "done";
              const label = dueLabel(task.due_date, today);
              return (
                <li
                  key={task.id}
                  className="group flex items-center gap-3 rounded-lg px-1 py-1.5 hover:bg-foreground/5"
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isDone}
                    aria-label={isDone ? "Вернуть в работу" : "Отметить выполненной"}
                    onClick={() =>
                      run({ id: task.id, done: !isDone }, () => setTaskDone(task.id, !isDone))
                    }
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full border text-xs ${
                      isDone ? "border-accent bg-accent text-white" : "border-muted hover:border-accent"
                    }`}
                  >
                    {isDone && "✓"}
                  </button>
                  <span className={`min-w-0 flex-1 truncate text-sm ${isDone ? "text-muted line-through" : ""}`}>
                    {task.title}
                  </span>
                  {task.priority > 0 && !isDone && (
                    <span
                      className={`size-2 shrink-0 rounded-full ${priorityColor[task.priority]}`}
                      title={priorityLabel[task.priority]}
                      aria-label={priorityLabel[task.priority]}
                    />
                  )}
                  {label && !isDone && <span className="shrink-0 text-xs text-muted">{label}</span>}
                  <button
                    type="button"
                    aria-label="Удалить задачу"
                    onClick={() => run({ id: task.id, deleted: true }, () => deleteTask(task.id))}
                    className="shrink-0 px-1 text-muted opacity-60 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100"
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

// Типы таблиц из supabase/migrations. После подключения проекта их лучше
// генерировать автоматически: npm run db:types (см. README).
// Этот же файл потом переиспользует iOS-приложение на Expo.

type Table<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export type TaskStatus = "todo" | "in_progress" | "done";
export type HabitFrequency = "daily" | "weekly";
export type AccountKind = "cash" | "card" | "bank" | "savings" | "other";
export type MoneyFlow = "income" | "expense";

export type Task = {
  id: string;
  user_id: string;
  title: string;
  notes: string | null;
  status: TaskStatus;
  priority: number;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Habit = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  frequency: HabitFrequency;
  target_per_period: number;
  archived_at: string | null;
  created_at: string;
};

export type HabitLog = {
  id: string;
  user_id: string;
  habit_id: string;
  log_date: string;
  count: number;
  created_at: string;
};

export type Account = {
  id: string;
  user_id: string;
  name: string;
  kind: AccountKind;
  currency: string;
  archived_at: string | null;
  created_at: string;
};

export type Category = {
  id: string;
  user_id: string;
  name: string;
  kind: MoneyFlow;
  created_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  kind: MoneyFlow;
  amount: number;
  occurred_on: string;
  note: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      tasks: Table<Task, "title">;
      habits: Table<Habit, "name">;
      habit_logs: Table<HabitLog, "habit_id">;
      accounts: Table<Account, "name">;
      categories: Table<Category, "name" | "kind">;
      transactions: Table<Transaction, "account_id" | "kind" | "amount">;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

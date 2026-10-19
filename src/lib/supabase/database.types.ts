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
  // Остаток до первой операции; поле из миграции 20261019120000_finance.
  opening_balance: number;
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
  // Отпечаток строки CSV-импорта, у ручных операций null.
  import_key: string | null;
  created_at: string;
};

// Представления из миграции 20261019120000_finance.
export type AccountBalance = {
  account_id: string;
  user_id: string;
  balance: number;
  transactions_count: number;
};

export type MonthlyTotal = {
  user_id: string;
  // Первое число месяца, YYYY-MM-DD.
  month: string;
  currency: string;
  kind: MoneyFlow;
  category_id: string | null;
  total: number;
  transactions_count: number;
};

type View<Row> = { Row: Row; Relationships: [] };

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
    Views: {
      account_balances: View<AccountBalance>;
      monthly_totals: View<MonthlyTotal>;
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

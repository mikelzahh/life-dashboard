# Дашборд жизни

Личный дашборд для одного пользователя: задачи, привычки, финансы.
Стек: Next.js 16 (App Router) + TypeScript + Tailwind CSS 4, данные и вход в Supabase (Postgres + Auth).
Позже к тем же данным подключится iOS-приложение на Expo.

## Что уже есть

- Навигация по разделам: **Главная**, **Задачи и привычки**, **Финансы** (`src/app/(dashboard)`).
- Главная страница с заглушками виджетов.
- Клиенты Supabase для браузера и сервера (`src/lib/supabase`), ключи берутся из переменных окружения.
- `src/proxy.ts` обновляет сессию и пускает на страницы только после входа (пока ключей нет, вход отключён и всё открыто).
- Вход по ссылке на почту: `/login` и `/auth/callback`.
- Первая схема БД: `supabase/migrations/20261019000000_initial_schema.sql`
  (таблицы `tasks`, `habits`, `habit_logs`, `accounts`, `categories`, `transactions`, у всех RLS «только владелец»).
- Типы таблиц: `src/lib/supabase/database.types.ts`.

## Запуск без Supabase

```bash
npm install
npm run dev
```

Откройте http://localhost:3000. Сверху будет плашка «Supabase ещё не подключён», это нормально.

## Что нужно сделать вам: подключить Supabase

1. **Создайте аккаунт и проект** на https://supabase.com (бесплатного тарифа хватит).
   Регион выберите поближе, например Frankfurt. Пароль от базы сохраните в менеджере паролей.
2. **Скопируйте ключи.** В проекте откройте *Project Settings → API Keys* (или кнопку *Connect → App Frameworks → Next.js*).
   Нужны **Project URL** и **Publishable key** (`sb_publishable_…`). Секретный ключ (`sb_secret_…` / `service_role`) в приложение не кладите.
3. **Создайте `.env.local`** в корне проекта:
   ```bash
   cp .env.example .env.local
   ```
   и вставьте значения:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<ваш-проект>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
4. **Примените миграцию** одним из способов:
   - проще всего: *SQL Editor → New query*, вставить содержимое `supabase/migrations/20261019000000_initial_schema.sql` и нажать *Run*;
   - или через Supabase CLI:
     ```bash
     npx supabase login
     npx supabase link --project-ref <ref-проекта>
     npx supabase db push
     ```
5. **Настройте вход.** *Authentication → URL Configuration*: в *Site URL* укажите `http://localhost:3000`,
   в *Redirect URLs* добавьте `http://localhost:3000/auth/callback` (позже и адрес продакшена).
   Чтобы никто, кроме вас, не завёл аккаунт: войдите один раз через `/login`, затем в
   *Authentication → Sign In / Providers* выключите *Allow new users to sign up*.
6. Перезапустите `npm run dev`, откройте http://localhost:3000, вас перебросит на `/login`.

После изменений схемы типы можно перегенерировать: `npx supabase link …` один раз, затем `npm run db:types`.

## Структура

```
src/
  app/
    (dashboard)/        главная, tasks/, finance/ и общий layout с навигацией
    login/              форма входа по ссылке
    auth/callback/      обмен кода из письма на сессию
  components/           навигация, карточки-виджеты, плашка настройки
  lib/supabase/         env, клиенты (browser/server/proxy), типы БД
  proxy.ts              обновление сессии и защита страниц
supabase/migrations/    SQL-миграции
```

## Заметки для разработки

- В проекте включены Cache Components (`next.config.ts`). Серверный код, который читает сессию
  (`createClient` из `@/lib/supabase/server`), должен рендериться внутри `<Suspense>`.
- Документация именно этой версии Next.js лежит в `node_modules/next/dist/docs/`.

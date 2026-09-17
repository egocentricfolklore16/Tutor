-- Migration: Plans, Payments, and Subscriptions tables for Paystack billing integration

-- 1. Create `plans` table
create table if not exists public.plans (
  id text primary key, -- 'free' | 'pro' | 'elite'
  name text not null,
  price_naira integer not null default 0,
  price_kobo integer generated always as (price_naira * 100) stored,
  billing_interval text not null default 'month',
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0
);

-- RLS for plans
alter table public.plans enable row level security;

create policy "Anyone can view active plans"
  on public.plans for select
  using (is_active = true);

-- Seed initial plans
insert into public.plans (id, name, price_naira, billing_interval, features, is_active, sort_order)
values
  (
    'free',
    'Free',
    0,
    'month',
    '["Access to core study tools", "Standard AI tutor response", "Basic progress tracking"]'::jsonb,
    true,
    1
  ),
  (
    'pro',
    'Pro',
    2500, -- TODO: Placeholder price (₦2,500/month), awaiting confirmation
    'month',
    '["Everything in Free", "Unlimited AI Socratic guidance", "Advanced Analytics & Gaps diagnosis", "Priority study session access"]'::jsonb,
    true,
    2
  ),
  (
    'elite',
    'Elite',
    5000, -- TODO: Placeholder price (₦5,000/month), awaiting confirmation
    'month',
    '["Everything in Pro", "1-on-1 AI Tutoring custom agents", "Unlimited practice quizzes & flashcards", "24/7 Priority support"]'::jsonb,
    true,
    3
  )
on conflict (id) do update set
  name = excluded.name,
  price_naira = excluded.price_naira,
  billing_interval = excluded.billing_interval,
  features = excluded.features,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;


-- 2. Create `payments` table
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  reference text unique not null,
  amount integer not null, -- amount in kobo
  currency text not null default 'NGN',
  status text not null,
  purpose text not null, -- e.g. 'subscription:pro' or 'subscription:elite'
  created_at timestamptz default now(),
  verified_at timestamptz null
);

-- RLS for payments
alter table public.payments enable row level security;

create policy "Users can view own payments"
  on public.payments for select
  using (auth.uid() = user_id);


-- 3. Create `subscriptions` table
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  plan_id text references public.plans(id) not null default 'free',
  status text not null default 'active', -- 'active' | 'inactive' | 'cancelled'
  current_period_start timestamptz default now(),
  current_period_end timestamptz null,
  payment_id uuid references public.payments(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS for subscriptions
alter table public.subscriptions enable row level security;

create policy "Users can view own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);


-- 4. Hook into user signup trigger to create default free subscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_full_name text;
begin
  next_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'userName'), ''),
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    'Learner'
  );

  -- Insert profile
  insert into public.profiles (user_id, full_name)
  values (new.id, next_full_name)
  on conflict (user_id) do nothing;

  -- Insert default free subscription
  insert into public.subscriptions (user_id, plan_id, status, current_period_start)
  values (new.id, 'free', 'active', now())
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Backfill missing subscriptions for existing users/profiles
insert into public.subscriptions (user_id, plan_id, status, current_period_start)
select user_id, 'free', 'active', now()
from public.profiles
on conflict (user_id) do nothing;

notify pgrst, 'reload schema';

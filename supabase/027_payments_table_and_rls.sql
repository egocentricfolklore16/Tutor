-- Migration: 027_payments_table_and_rls.sql
-- Ensure payments table definition and strict RLS policies match exact specification.

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  reference text unique not null,
  amount integer not null, -- amount in kobo
  currency text not null default 'NGN',
  status text not null,
  purpose text null, -- TODO: what this payment is for (e.g. subscription:pro)
  created_at timestamptz default now(),
  verified_at timestamptz null
);

-- Alter purpose column to be nullable if table existed previously with NOT NULL
alter table public.payments alter column purpose drop not null;

-- Enable Row Level Security
alter table public.payments enable row level security;

-- Drop existing policies if any to ensure clean application
drop policy if exists "Users can view own payments" on public.payments;
drop policy if exists "Users can select own payments" on public.payments;

-- RLS: Users can SELECT only their own rows
create policy "Users can select own payments"
  on public.payments
  for select
  using (auth.uid() = user_id);

-- No INSERT, UPDATE, or DELETE policies are granted to authenticated/anon users.
-- Direct client-side writes are blocked. Service role (used by Edge Functions) bypasses RLS.

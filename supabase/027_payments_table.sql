-- Migration: Create payments table and RLS policies for Paystack integration

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  reference text unique not null,
  amount integer not null, -- amount in kobo
  currency text not null default 'NGN',
  status text not null,
  purpose text null, -- TODO: What this payment is for
  created_at timestamptz default now(),
  verified_at timestamptz null
);

-- Enable Row Level Security
alter table public.payments enable row level security;

-- Drop policy if exists to allow idempotency in migrations
drop policy if exists "Users can view own payments" on public.payments;

-- RLS: users can SELECT only their own rows
create policy "Users can view own payments"
  on public.payments for select
  using (auth.uid() = user_id);

-- Note: No INSERT or UPDATE policies are created for anon/authenticated roles.
-- Client-side writes are strictly forbidden. Only the Supabase service role (Edge Functions) can write/update.

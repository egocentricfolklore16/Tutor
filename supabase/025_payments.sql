-- Payments table for Paystack transaction records
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reference text not null unique,
  amount integer not null, -- amount in kobo
  currency text not null default 'NGN',
  status text not null,
  purpose text, -- TODO: define payment purpose (subscription, gems, etc.)
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

-- Enable RLS on payments
alter table public.payments enable row level security;

-- RLS: Users can SELECT only their own payment records
drop policy if exists "Users can view own payments" on public.payments;
create policy "Users can view own payments"
  on public.payments
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Note: No INSERT or UPDATE policies are created for authenticated/anon users.
-- Writes to public.payments are restricted strictly to the service_role (Edge Functions).

create index if not exists payments_user_id_idx on public.payments(user_id);
create index if not exists payments_reference_idx on public.payments(reference);

notify pgrst, 'reload schema';

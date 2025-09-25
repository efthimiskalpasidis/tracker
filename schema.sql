-- Enable required extension for UUID
create extension if not exists "uuid-ossp";

-- Create transactions table
create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) not null,
  amount numeric not null,
  category text not null,
  note text,
  transaction_date date not null default current_date,
  created_at timestamp with time zone default now()  
);

-- Enable Row Level Security
alter table public.transactions enable row level security;

-- Policies
create policy "Users can insert their own transactions"
on public.transactions for insert
with check (auth.uid() = user_id);

create policy "Users can select their own transactions"
on public.transactions for select
using (auth.uid() = user_id);

create policy "Users can update their own transactions"
on public.transactions for update
using (auth.uid() = user_id);

create policy "Users can delete their own transactions"
on public.transactions for delete
using (auth.uid() = user_id);
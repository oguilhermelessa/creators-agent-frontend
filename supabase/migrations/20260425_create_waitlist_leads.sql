create extension if not exists pgcrypto;

create table if not exists public.waitlist_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  whatsapp text,
  niche text not null,
  audience text not null,
  goal text not null,
  byok boolean not null default false,
  source text not null default 'landing-page',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_waitlist_leads_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_waitlist_leads_updated_at on public.waitlist_leads;

create trigger set_waitlist_leads_updated_at
before update on public.waitlist_leads
for each row
execute function public.set_waitlist_leads_updated_at();

alter table public.waitlist_leads enable row level security;

create table landlord_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade unique,
  first_name text not null default '',
  last_name text not null default '',
  street text not null default '',
  number text not null default '',
  postal_code text not null default '',
  city text not null default '',
  phone text not null default '',
  email text not null default '',
  iban_country text not null default 'BE',
  iban text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table landlord_profiles enable row level security;

create policy "Owners manage their landlord profile"
  on landlord_profiles for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

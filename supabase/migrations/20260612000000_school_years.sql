create table school_years (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now(),
  unique (owner_id, label)
);

alter table school_years enable row level security;

create policy "Owners manage their school years"
  on school_years for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

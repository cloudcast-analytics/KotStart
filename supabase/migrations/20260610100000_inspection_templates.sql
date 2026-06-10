create table inspection_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade unique,
  categories jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table inspection_templates enable row level security;

create policy "Owners manage their inspection template"
  on inspection_templates for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

alter table inspection_items
  add column if not exists meter_value numeric,
  add column if not exists meter_unit text;

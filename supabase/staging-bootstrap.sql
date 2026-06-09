-- =====================================================================
-- KotStart — STAGING bootstrap
-- Eenmalig uitvoeren op een VERS Supabase-project (staging).
-- Bevat de 9 repo-migraties in volgorde + een correctie van de
-- signup-functies (productie liet national_registry_number vallen maar
-- de migratie herzag de functie niet). Resultaat = identiek aan productie.
-- Plak dit volledig in de Supabase SQL Editor van het staging-project en Run.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) 20260521000000_initial
-- ---------------------------------------------------------------------
create table properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id),
  name text not null,
  address text,
  contract_city text,
  created_at timestamptz default now()
);

create table rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id) on delete cascade,
  room_number text not null,
  room_type text check (room_type in ('studio','single','double')) not null,
  monthly_rent numeric(10,2),
  student_tax numeric(10,2),
  fixed_costs numeric(10,2),
  deposit numeric(10,2)
);

create table students (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id),
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  date_of_birth date,
  photo_url text,
  institution text,
  student_number text,
  primary_residence text,
  created_at timestamptz default now()
);

create table contracts (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id),
  school_year text not null,
  student_id uuid references students(id),
  second_student_id uuid references students(id),
  second_landlord_name text,
  second_landlord_email text,
  guardian_name text,
  guardian_email text,
  guardian_phone text,
  status text check (status in ('draft','sent','signed')) default 'draft',
  signed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz default now()
);

create table inspections (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid references contracts(id),
  type text check (type in ('start','end')) not null,
  overview_photo_url text,
  created_at timestamptz default now()
);

create table inspection_items (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid references inspections(id) on delete cascade,
  category text not null,
  item_name text not null,
  condition text check (condition in ('good','moderate','bad','unusable')),
  photo_url text,
  notes text
);

insert into storage.buckets (id, name, public)
values
  ('student-photos', 'student-photos', true),
  ('inspection-photos', 'inspection-photos', true)
on conflict (id) do nothing;

create policy "Public student photos are readable"
on storage.objects for select
using (bucket_id = 'student-photos');

create policy "Public inspection photos are readable"
on storage.objects for select
using (bucket_id = 'inspection-photos');

create policy "Student photos can be uploaded"
on storage.objects for insert
with check (bucket_id = 'student-photos');

create policy "Inspection photos can be uploaded"
on storage.objects for insert
with check (bucket_id = 'inspection-photos');


-- ---------------------------------------------------------------------
-- 2) 20260523000000_security_hardening
-- ---------------------------------------------------------------------
alter table properties enable row level security;
alter table rooms enable row level security;
alter table students enable row level security;
alter table contracts enable row level security;
alter table inspections enable row level security;
alter table inspection_items enable row level security;

alter table properties add column if not exists owner_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table students add column if not exists owner_id uuid default auth.uid() references auth.users(id) on delete cascade;

create index if not exists properties_owner_id_idx on properties(owner_id);
create index if not exists students_owner_id_idx on students(owner_id);
create index if not exists rooms_property_id_idx on rooms(property_id);
create index if not exists contracts_room_id_idx on contracts(room_id);
create index if not exists contracts_student_id_idx on contracts(student_id);
create index if not exists inspections_contract_id_idx on inspections(contract_id);
create index if not exists inspection_items_inspection_id_idx on inspection_items(inspection_id);

drop policy if exists "Users can read own properties" on properties;
create policy "Users can read own properties"
on properties for select
using (owner_id = auth.uid());

drop policy if exists "Users can insert own properties" on properties;
create policy "Users can insert own properties"
on properties for insert
with check (owner_id = auth.uid());

drop policy if exists "Users can update own properties" on properties;
create policy "Users can update own properties"
on properties for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Users can read rooms for own properties" on rooms;
create policy "Users can read rooms for own properties"
on rooms for select
using (
  exists (
    select 1 from properties
    where properties.id = rooms.property_id
      and properties.owner_id = auth.uid()
  )
);

drop policy if exists "Users can insert rooms for own properties" on rooms;
create policy "Users can insert rooms for own properties"
on rooms for insert
with check (
  exists (
    select 1 from properties
    where properties.id = rooms.property_id
      and properties.owner_id = auth.uid()
  )
);

drop policy if exists "Users can update rooms for own properties" on rooms;
create policy "Users can update rooms for own properties"
on rooms for update
using (
  exists (
    select 1 from properties
    where properties.id = rooms.property_id
      and properties.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from properties
    where properties.id = rooms.property_id
      and properties.owner_id = auth.uid()
  )
);

drop policy if exists "Users can read own students" on students;
create policy "Users can read own students"
on students for select
using (owner_id = auth.uid());

drop policy if exists "Users can insert own students" on students;
create policy "Users can insert own students"
on students for insert
with check (owner_id = auth.uid());

drop policy if exists "Users can update own students" on students;
create policy "Users can update own students"
on students for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "Users can read own contracts" on contracts;
create policy "Users can read own contracts"
on contracts for select
using (
  exists (
    select 1 from rooms
    join properties on properties.id = rooms.property_id
    where rooms.id = contracts.room_id
      and properties.owner_id = auth.uid()
  )
);

drop policy if exists "Users can insert own contracts" on contracts;
create policy "Users can insert own contracts"
on contracts for insert
with check (
  exists (
    select 1 from rooms
    join properties on properties.id = rooms.property_id
    where rooms.id = contracts.room_id
      and properties.owner_id = auth.uid()
  )
  and exists (
    select 1 from students
    where students.id = contracts.student_id
      and students.owner_id = auth.uid()
  )
);

drop policy if exists "Users can update own contracts" on contracts;
create policy "Users can update own contracts"
on contracts for update
using (
  exists (
    select 1 from rooms
    join properties on properties.id = rooms.property_id
    where rooms.id = contracts.room_id
      and properties.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from rooms
    join properties on properties.id = rooms.property_id
    where rooms.id = contracts.room_id
      and properties.owner_id = auth.uid()
  )
);

drop policy if exists "Users can read own inspections" on inspections;
create policy "Users can read own inspections"
on inspections for select
using (
  exists (
    select 1 from contracts
    join rooms on rooms.id = contracts.room_id
    join properties on properties.id = rooms.property_id
    where contracts.id = inspections.contract_id
      and properties.owner_id = auth.uid()
  )
);

drop policy if exists "Users can insert own inspections" on inspections;
create policy "Users can insert own inspections"
on inspections for insert
with check (
  exists (
    select 1 from contracts
    join rooms on rooms.id = contracts.room_id
    join properties on properties.id = rooms.property_id
    where contracts.id = inspections.contract_id
      and properties.owner_id = auth.uid()
  )
);

drop policy if exists "Users can read own inspection items" on inspection_items;
create policy "Users can read own inspection items"
on inspection_items for select
using (
  exists (
    select 1 from inspections
    join contracts on contracts.id = inspections.contract_id
    join rooms on rooms.id = contracts.room_id
    join properties on properties.id = rooms.property_id
    where inspections.id = inspection_items.inspection_id
      and properties.owner_id = auth.uid()
  )
);

drop policy if exists "Users can insert own inspection items" on inspection_items;
create policy "Users can insert own inspection items"
on inspection_items for insert
with check (
  exists (
    select 1 from inspections
    join contracts on contracts.id = inspections.contract_id
    join rooms on rooms.id = contracts.room_id
    join properties on properties.id = rooms.property_id
    where inspections.id = inspection_items.inspection_id
      and properties.owner_id = auth.uid()
  )
);

update storage.buckets
set public = false
where id in ('student-photos', 'inspection-photos');

drop policy if exists "Public student photos are readable" on storage.objects;
drop policy if exists "Public inspection photos are readable" on storage.objects;
drop policy if exists "Student photos can be uploaded" on storage.objects;
drop policy if exists "Inspection photos can be uploaded" on storage.objects;

create policy "Authenticated users can read student photos"
on storage.objects for select
using (
  bucket_id = 'student-photos'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Authenticated users can read inspection photos"
on storage.objects for select
using (
  bucket_id = 'inspection-photos'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Authenticated users can upload student photos"
on storage.objects for insert
with check (
  bucket_id = 'student-photos'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Authenticated users can upload inspection photos"
on storage.objects for insert
with check (
  bucket_id = 'inspection-photos'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);


-- ---------------------------------------------------------------------
-- 3) 20260523001000_bootstrap_user_property
-- ---------------------------------------------------------------------
create or replace function public.create_default_property_for_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  property_id uuid;
begin
  insert into public.properties (owner_id, name, address)
  values (new.id, 'KotStart Demo Pand', 'Vul je pandadres in via Panden')
  returning id into property_id;

  insert into public.rooms (
    property_id, room_number, room_type, monthly_rent, student_tax, fixed_costs, deposit
  )
  values
    (property_id, '101', 'single', 450, 0, 95, 900),
    (property_id, '102', 'single', 450, 0, 95, 900),
    (property_id, '201', 'studio', 620, 0, 120, 1240),
    (property_id, '202', 'single', 475, 0, 95, 950);

  return new;
end;
$$;

drop trigger if exists create_default_property_after_signup on auth.users;
create trigger create_default_property_after_signup
after insert on auth.users
for each row
execute function public.create_default_property_for_user();


-- ---------------------------------------------------------------------
-- 4) 20260524000000_allow_room_delete
-- ---------------------------------------------------------------------
drop policy if exists "Users can delete rooms for own properties" on rooms;
create policy "Users can delete rooms for own properties"
on rooms for delete
using (
  exists (
    select 1 from properties
    where properties.id = rooms.property_id
      and properties.owner_id = auth.uid()
  )
);


-- ---------------------------------------------------------------------
-- 7) 20260524003000_allow_contract_bundle_delete
-- ---------------------------------------------------------------------
drop policy if exists "Users can delete own inspection items" on inspection_items;
create policy "Users can delete own inspection items"
on inspection_items for delete
using (
  exists (
    select 1 from inspections
    join contracts on contracts.id = inspections.contract_id
    join rooms on rooms.id = contracts.room_id
    join properties on properties.id = rooms.property_id
    where inspections.id = inspection_items.inspection_id
      and properties.owner_id = auth.uid()
  )
);

drop policy if exists "Users can delete own inspections" on inspections;
create policy "Users can delete own inspections"
on inspections for delete
using (
  exists (
    select 1 from contracts
    join rooms on rooms.id = contracts.room_id
    join properties on properties.id = rooms.property_id
    where contracts.id = inspections.contract_id
      and properties.owner_id = auth.uid()
  )
);

drop policy if exists "Users can delete own contracts" on contracts;
create policy "Users can delete own contracts"
on contracts for delete
using (
  exists (
    select 1 from rooms
    join properties on properties.id = rooms.property_id
    where rooms.id = contracts.room_id
      and properties.owner_id = auth.uid()
  )
);

drop policy if exists "Users can delete own students" on students;
create policy "Users can delete own students"
on students for delete
using (owner_id = auth.uid());


-- ---------------------------------------------------------------------
-- 9) 20260606120000_student_residence_institution  (Cluster B)
-- ---------------------------------------------------------------------
alter table students
  add column if not exists residence_street      text,
  add column if not exists residence_number      text,
  add column if not exists residence_box         text,
  add column if not exists residence_postal_code text,
  add column if not exists residence_city        text,
  add column if not exists faculty               text;


-- ---------------------------------------------------------------------
-- Signup-functie: gecorrigeerde versie (zoals productie nu draait,
-- ZONDER national_registry_number). Vervangt de oude versie zodat
-- registreren op staging werkt en een Vincent Grobben-demo-contract
-- wordt aangemaakt voor elke nieuwe gebruiker.
-- ---------------------------------------------------------------------
create or replace function public.ensure_vincent_grobben_demo_contract(user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_property_id uuid;
  v_room_id uuid;
  v_student_id uuid;
begin
  select id into v_property_id
  from public.properties
  where owner_id = user_id
  order by created_at nulls last, name
  limit 1;

  if v_property_id is null then
    insert into public.properties (owner_id, name, address)
    values (user_id, 'KotStart Demo Pand', 'Vul je pandadres in via Panden')
    returning id into v_property_id;
  end if;

  select rooms.id into v_room_id
  from public.rooms
  where rooms.property_id = v_property_id
    and rooms.room_number = '999'
  limit 1;

  if v_room_id is null then
    insert into public.rooms (property_id, room_number, room_type, monthly_rent, student_tax, fixed_costs, deposit)
    values (v_property_id, '999', 'single', 500, 0, 95, 1000)
    returning id into v_room_id;
  end if;

  select id into v_student_id
  from public.students
  where owner_id = user_id
    and (
      (first_name = 'Vincent' and last_name = 'Grobben')
      or first_name in ('Testpiet', 'DEMO-student')
      or email in ('testpiet@example.com', 'demo-student@example.com', 'vincent.grobben@example.com')
    )
  order by created_at nulls last
  limit 1;

  if v_student_id is null then
    insert into public.students (owner_id, first_name, last_name, email, phone, date_of_birth, institution, student_number, primary_residence)
    values (user_id, 'Vincent', 'Grobben', 'vincent.grobben@example.com', '0470 00 00 00', '2005-01-01', 'Demo Hogeschool', 'DEMO-001', 'Teststraat 1, 9000 Gent')
    returning id into v_student_id;
  else
    update public.students set
      first_name = 'Vincent',
      last_name = 'Grobben',
      email = 'vincent.grobben@example.com',
      phone = coalesce(nullif(phone, ''), '0470 00 00 00'),
      date_of_birth = coalesce(date_of_birth, '2005-01-01'),
      institution = coalesce(nullif(institution, ''), 'Demo Hogeschool'),
      student_number = coalesce(nullif(student_number, ''), 'DEMO-001'),
      primary_residence = coalesce(nullif(primary_residence, ''), 'Teststraat 1, 9000 Gent')
    where id = v_student_id;
  end if;

  if not exists (
    select 1 from public.contracts
    where contracts.student_id = v_student_id
      and contracts.school_year = '2025–2026'
  ) then
    insert into public.contracts (room_id, school_year, student_id, status)
    values (v_room_id, '2025–2026', v_student_id, 'sent');
  end if;
end;
$$;

create or replace function public.create_default_property_for_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  property_id uuid;
begin
  insert into public.properties (owner_id, name, address)
  values (new.id, 'KotStart Demo Pand', 'Vul je pandadres in via Panden')
  returning id into property_id;

  insert into public.rooms (
    property_id, room_number, room_type, monthly_rent, student_tax, fixed_costs, deposit
  )
  values
    (property_id, '101', 'single', 450, 0, 95, 900),
    (property_id, '102', 'single', 450, 0, 95, 900),
    (property_id, '201', 'studio', 620, 0, 120, 1240),
    (property_id, '202', 'single', 475, 0, 95, 950);

  perform public.ensure_vincent_grobben_demo_contract(new.id);

  return new;
end;
$$;

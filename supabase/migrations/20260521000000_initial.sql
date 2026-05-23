-- KotBeheer: initieel databaseschema

create table properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
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
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  date_of_birth date,
  photo_url text,
  national_registry_number text,
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

-- Security hardening for production data access.
-- Apply this after ownership has been reviewed for any existing seeded rows.

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

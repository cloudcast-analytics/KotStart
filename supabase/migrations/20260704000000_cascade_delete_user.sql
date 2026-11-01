-- Add ON DELETE CASCADE to owner_id foreign keys so users can be deleted from auth.users
-- without first manually removing their properties and students.

alter table properties
  drop constraint if exists properties_owner_id_fkey,
  add constraint properties_owner_id_fkey
    foreign key (owner_id) references auth.users(id) on delete cascade;

alter table students
  drop constraint if exists students_owner_id_fkey,
  add constraint students_owner_id_fkey
    foreign key (owner_id) references auth.users(id) on delete cascade;

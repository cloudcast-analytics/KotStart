-- Add ON DELETE CASCADE to contracts and inspections so the full delete chain works
-- when a user (landlord) is deleted from auth.users.
-- Chain: auth.users → properties → rooms → contracts → inspections

alter table contracts
  drop constraint if exists contracts_room_id_fkey,
  add constraint contracts_room_id_fkey
    foreign key (room_id) references rooms(id) on delete cascade;

alter table contracts
  drop constraint if exists contracts_student_id_fkey,
  add constraint contracts_student_id_fkey
    foreign key (student_id) references students(id) on delete cascade;

alter table contracts
  drop constraint if exists contracts_second_student_id_fkey,
  add constraint contracts_second_student_id_fkey
    foreign key (second_student_id) references students(id) on delete cascade;

alter table inspections
  drop constraint if exists inspections_contract_id_fkey,
  add constraint inspections_contract_id_fkey
    foreign key (contract_id) references contracts(id) on delete cascade;

alter table students
  add column guardian_name  text,
  add column guardian_email text,
  add column guardian_phone text;

alter table contracts
  drop column second_landlord_name,
  drop column second_landlord_email,
  drop column guardian_name,
  drop column guardian_email,
  drop column guardian_phone;

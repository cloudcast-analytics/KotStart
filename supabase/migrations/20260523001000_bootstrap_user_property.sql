-- Give every new landlord account a starter property and rooms.
-- This keeps the production app usable immediately after signup.

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
    property_id,
    room_number,
    room_type,
    monthly_rent,
    student_tax,
    fixed_costs,
    deposit
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

do $$
declare
  user_record record;
  property_id uuid;
begin
  for user_record in
    select id
    from auth.users
    where not exists (
      select 1
      from public.properties
      where properties.owner_id = auth.users.id
    )
  loop
    insert into public.properties (owner_id, name, address)
    values (user_record.id, 'KotStart Demo Pand', 'Vul je pandadres in via Panden')
    returning id into property_id;

    insert into public.rooms (
      property_id,
      room_number,
      room_type,
      monthly_rent,
      student_tax,
      fixed_costs,
      deposit
    )
    values
      (property_id, '101', 'single', 450, 0, 95, 900),
      (property_id, '102', 'single', 450, 0, 95, 900),
      (property_id, '201', 'studio', 620, 0, 120, 1240),
      (property_id, '202', 'single', 475, 0, 95, 950);
  end loop;
end $$;

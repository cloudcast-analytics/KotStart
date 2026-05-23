create or replace function public.ensure_testpiet_demo_contract(user_id uuid)
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
    insert into public.rooms (
      property_id,
      room_number,
      room_type,
      monthly_rent,
      student_tax,
      fixed_costs,
      deposit
    )
    values (v_property_id, '999', 'single', 500, 0, 95, 1000)
    returning id into v_room_id;
  end if;

  select id into v_student_id
  from public.students
  where owner_id = user_id
    and first_name = 'Testpiet'
  limit 1;

  if v_student_id is null then
    insert into public.students (
      owner_id,
      first_name,
      last_name,
      email,
      phone,
      date_of_birth,
      national_registry_number,
      institution,
      student_number,
      primary_residence
    )
    values (
      user_id,
      'Testpiet',
      'Demo',
      'testpiet@example.com',
      '0470 00 00 00',
      '2005-01-01',
      '05.01.01-000.00',
      'Demo Hogeschool',
      'TEST-001',
      'Teststraat 1, 9000 Gent'
    )
    returning id into v_student_id;
  end if;

  if not exists (
    select 1
    from public.contracts
    where contracts.student_id = v_student_id
      and contracts.school_year = '2025–2026'
  ) then
    insert into public.contracts (
      room_id,
      school_year,
      student_id,
      status
    )
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

  perform public.ensure_testpiet_demo_contract(new.id);

  return new;
end;
$$;

do $$
declare
  user_record record;
begin
  for user_record in
    select id from auth.users
  loop
    perform public.ensure_testpiet_demo_contract(user_record.id);
  end loop;
end $$;

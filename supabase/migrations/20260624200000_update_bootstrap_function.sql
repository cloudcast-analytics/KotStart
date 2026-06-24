-- Update the bootstrap function to use all current columns.
-- Runs on auth.users INSERT (new signup).

create or replace function public.create_default_property_for_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_property_id uuid;
  v_room_id uuid;
  v_student_id uuid;
begin
  -- 1. Property with split address fields
  insert into public.properties (
    owner_id, name, street, number, postal_code, city, indexation_enabled
  )
  values (
    new.id, 'KotStart Demo Pand', 'Voorbeeldstraat', '1', '9000', 'Gent', true
  )
  returning id into v_property_id;

  -- 2. Rooms with base_rent tracking
  insert into public.rooms (
    property_id, room_number, room_type,
    monthly_rent, student_tax, fixed_costs, deposit,
    base_rent, base_rent_year
  )
  values
    (v_property_id, '101', 'single', 450, 12, 95, 900, 450, 2024),
    (v_property_id, '102', 'single', 450, 12, 95, 900, 450, 2024),
    (v_property_id, '201', 'studio', 620, 12, 120, 1240, 620, 2024),
    (v_property_id, '202', 'single', 475, 12, 95, 950, 475, 2024);

  -- 3. Demo student with split residence fields
  insert into public.students (
    owner_id, first_name, last_name, email, phone, date_of_birth,
    institution, faculty, student_number,
    residence_street, residence_number, residence_postal_code, residence_city
  )
  values (
    new.id, 'Vincent', 'Grobben',
    'vincent.grobben@example.com', '0470 00 00 00', '2005-01-01',
    'Hogeschool Gent (HoGent)', 'Bedrijfsmanagement', 'DEMO-001',
    'Teststraat', '1', '9000', 'Gent'
  )
  returning id into v_student_id;

  -- 4. Pick the first room for the demo contract
  select id into v_room_id
  from public.rooms
  where property_id = v_property_id
  order by room_number
  limit 1;

  -- 5. Contract with rent snapshot
  insert into public.contracts (
    room_id, school_year, student_id, status,
    monthly_rent, fixed_costs, student_tax
  )
  values (
    v_room_id, '2025–2026', v_student_id, 'sent',
    450, 95, 12
  );

  -- 6. Default school year for the owner
  insert into public.school_years (owner_id, label)
  values (new.id, '2025–2026')
  on conflict do nothing;

  return new;
end;
$$;

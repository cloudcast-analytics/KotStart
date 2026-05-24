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

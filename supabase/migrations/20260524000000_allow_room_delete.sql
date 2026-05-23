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

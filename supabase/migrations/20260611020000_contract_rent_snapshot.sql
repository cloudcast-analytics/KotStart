alter table contracts
  add column if not exists monthly_rent numeric(10,2),
  add column if not exists fixed_costs numeric(10,2),
  add column if not exists student_tax numeric(10,2);

-- Bestaande contracten bevriezen op de huidige kamerprijzen, zodat ze vanaf nu
-- onveranderlijk zijn ook al wijzigen de kamerprijzen later.
update contracts c
set monthly_rent = r.monthly_rent,
    fixed_costs = r.fixed_costs,
    student_tax = r.student_tax
from rooms r
where c.room_id = r.id
  and c.monthly_rent is null;

alter table inspection_templates
  add column if not exists property_id uuid references public.properties(id) on delete cascade;

alter table inspection_templates
  drop constraint if exists inspection_templates_owner_id_key;

alter table inspection_templates
  add constraint inspection_templates_owner_id_property_id_key unique (owner_id, property_id);

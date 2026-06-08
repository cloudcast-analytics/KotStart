alter table inspection_items
  add column key_count integer check (key_count >= 0);

alter table inspections
  add column overview_photo_urls text[];

update inspections
  set overview_photo_urls = array[overview_photo_url]
  where overview_photo_url is not null;

alter table inspections
  drop column overview_photo_url;

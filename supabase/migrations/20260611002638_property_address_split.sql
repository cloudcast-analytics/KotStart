-- Cluster: gesplitst adres voor panden (straat/nummer/postcode/gemeente),
-- volgt dezelfde conventie als de domicilie-velden van studenten.
alter table properties
  add column if not exists street      text,
  add column if not exists number      text,
  add column if not exists postal_code text,
  add column if not exists city        text;

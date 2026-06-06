-- Cluster B: gesplitst domicilieadres + losse faculteit voor studenten.
alter table students
  add column if not exists residence_street      text,
  add column if not exists residence_number      text,
  add column if not exists residence_box         text,
  add column if not exists residence_postal_code text,
  add column if not exists residence_city        text,
  add column if not exists faculty               text;

-- De oude kolom primary_residence blijft bestaan (niet-destructief) maar wordt
-- door de applicatie niet langer geschreven of gelezen.

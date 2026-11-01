-- Herstelt de beveiliging die op 2026-06-20 rechtstreeks op staging is toegepast
-- (commit 1fbf635) en nooit als migratie is vastgelegd. Zonder dit bestand mist een
-- verse database de RPC's get_landlord_profile / save_landlord_profile die de
-- frontend aanroept, en kunnen verhuurders hun profiel niet opslaan.
--
-- 1. Alle RLS-policies enkel voor de rol authenticated
-- 2. Storage UPDATE/DELETE-policies op de eigen map
-- 3. IBAN versleuteld opgeslagen via pgcrypto + Vault
-- 4. Ongebruikte SECURITY DEFINER demo-functies verwijderen


-- ---------------------------------------------------------------------
-- 1) RLS: enkel authenticated (anon krijgt geen enkele policy)
-- ---------------------------------------------------------------------
do $$
declare
  p record;
begin
  for p in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and roles = '{public}'
  loop
    execute format(
      'alter policy %I on public.%I to authenticated',
      p.policyname, p.tablename
    );
  end loop;
end $$;


-- ---------------------------------------------------------------------
-- 2) Storage: lezen/uploaden/vervangen/verwijderen enkel in de eigen map
-- ---------------------------------------------------------------------
drop policy if exists "Authenticated users can read student photos" on storage.objects;
create policy "Authenticated users can read student photos"
on storage.objects for select to authenticated
using (bucket_id = 'student-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Authenticated users can read inspection photos" on storage.objects;
create policy "Authenticated users can read inspection photos"
on storage.objects for select to authenticated
using (bucket_id = 'inspection-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Authenticated users can upload student photos" on storage.objects;
create policy "Authenticated users can upload student photos"
on storage.objects for insert to authenticated
with check (bucket_id = 'student-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Authenticated users can upload inspection photos" on storage.objects;
create policy "Authenticated users can upload inspection photos"
on storage.objects for insert to authenticated
with check (bucket_id = 'inspection-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Authenticated users can update student photos" on storage.objects;
create policy "Authenticated users can update student photos"
on storage.objects for update to authenticated
using (bucket_id = 'student-photos' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'student-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Authenticated users can update inspection photos" on storage.objects;
create policy "Authenticated users can update inspection photos"
on storage.objects for update to authenticated
using (bucket_id = 'inspection-photos' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'inspection-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Authenticated users can delete student photos" on storage.objects;
create policy "Authenticated users can delete student photos"
on storage.objects for delete to authenticated
using (bucket_id = 'student-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Authenticated users can delete inspection photos" on storage.objects;
create policy "Authenticated users can delete inspection photos"
on storage.objects for delete to authenticated
using (bucket_id = 'inspection-photos' and (storage.foldername(name))[1] = auth.uid()::text);


-- ---------------------------------------------------------------------
-- 3) IBAN-versleuteling
--    De sleutel wordt in de database zelf gegenereerd en staat dus nergens
--    in git. Elk project krijgt zijn eigen sleutel in Vault.
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;
create extension if not exists supabase_vault with schema vault;

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'iban_encryption_key') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'iban_encryption_key',
      'Symmetrische sleutel voor landlord_profiles.iban_encrypted'
    );
  end if;
end $$;

alter table public.landlord_profiles
  add column if not exists iban_encrypted bytea;

update public.landlord_profiles
set iban_encrypted = extensions.pgp_sym_encrypt(
  iban,
  (select decrypted_secret from vault.decrypted_secrets where name = 'iban_encryption_key')
)
where iban <> '';

alter table public.landlord_profiles
  drop column iban;

create or replace function public.get_landlord_profile()
returns table (
  first_name text,
  last_name text,
  street text,
  number text,
  postal_code text,
  city text,
  phone text,
  email text,
  iban_country text,
  iban text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Niet ingelogd' using errcode = '42501';
  end if;

  return query
  select
    lp.first_name,
    lp.last_name,
    lp.street,
    lp.number,
    lp.postal_code,
    lp.city,
    lp.phone,
    lp.email,
    lp.iban_country,
    case
      when lp.iban_encrypted is null then ''
      else extensions.pgp_sym_decrypt(
        lp.iban_encrypted,
        (select ds.decrypted_secret from vault.decrypted_secrets ds where ds.name = 'iban_encryption_key')
      )
    end
  from public.landlord_profiles lp
  where lp.owner_id = v_user_id;
end;
$$;

create or replace function public.save_landlord_profile(
  p_first_name text,
  p_last_name text,
  p_street text,
  p_number text,
  p_postal_code text,
  p_city text,
  p_phone text,
  p_email text,
  p_iban_country text,
  p_iban text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_encrypted bytea;
begin
  if v_user_id is null then
    raise exception 'Niet ingelogd' using errcode = '42501';
  end if;

  if coalesce(p_iban, '') <> '' then
    v_encrypted := extensions.pgp_sym_encrypt(
      p_iban,
      (select ds.decrypted_secret from vault.decrypted_secrets ds where ds.name = 'iban_encryption_key')
    );
  end if;

  insert into public.landlord_profiles (
    owner_id, first_name, last_name, street, number, postal_code,
    city, phone, email, iban_country, iban_encrypted, updated_at
  )
  values (
    v_user_id, p_first_name, p_last_name, p_street, p_number, p_postal_code,
    p_city, p_phone, p_email, p_iban_country, v_encrypted, now()
  )
  on conflict (owner_id) do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    street = excluded.street,
    number = excluded.number,
    postal_code = excluded.postal_code,
    city = excluded.city,
    phone = excluded.phone,
    email = excluded.email,
    iban_country = excluded.iban_country,
    iban_encrypted = excluded.iban_encrypted,
    updated_at = now();
end;
$$;

revoke all on function public.get_landlord_profile() from public, anon;
revoke all on function public.save_landlord_profile(text, text, text, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.get_landlord_profile() to authenticated;
grant execute on function public.save_landlord_profile(text, text, text, text, text, text, text, text, text, text) to authenticated;


-- ---------------------------------------------------------------------
-- 4) Oude demo-functies: niet meer aangeroepen sinds 20260624200000,
--    verwijzen naar een gedropte kolom en waren via de API aanroepbaar
--    met een willekeurig user_id.
-- ---------------------------------------------------------------------
drop function if exists public.ensure_testpiet_demo_contract(uuid);
drop function if exists public.ensure_vincent_grobben_demo_contract(uuid);

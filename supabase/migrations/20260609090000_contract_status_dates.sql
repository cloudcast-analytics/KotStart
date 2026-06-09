alter table contracts
  add column if not exists signed_at timestamptz,
  add column if not exists sent_at timestamptz;

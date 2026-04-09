create table if not exists webauthn_credentials (
  id uuid primary key default gen_random_uuid(),
  credential_id text unique not null,
  public_key text not null,
  counter int default 0,
  device_name text,
  created_at timestamptz default now()
);
alter table webauthn_credentials enable row level security;
create policy "Service role only" on webauthn_credentials for all using (auth.role() = 'service_role');

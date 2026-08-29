create table if not exists pdv_snapshot (
  id text primary key,
  updated_at timestamptz not null default now(),
  data jsonb not null
);

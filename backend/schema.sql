create table if not exists public.contractor_applications (
 id uuid primary key default gen_random_uuid(),
 created_at timestamptz not null default now(),
 submitted_at timestamptz,
 status text not null default 'uploading' check (status in ('uploading','submitted','reviewing','approved','declined')),
 business text not null,
 contact_name text not null,
 email text not null,
 phone text not null,
 base_city text not null,
 province text not null,
 interest text not null,
 application jsonb not null,
 token_hash text not null,
 expires_at timestamptz not null default now()+interval '2 hours',
 is_test boolean not null default false
);
alter table public.contractor_applications enable row level security;
revoke all on public.contractor_applications from public, anon, authenticated;
grant all on public.contractor_applications to service_role;
create table if not exists public.contractor_equipment (
 id uuid primary key default gen_random_uuid(),
 application_id uuid not null references public.contractor_applications(id) on delete cascade,
 entry_number integer not null,
 equipment_type text not null,
 make text,
 model text,
 model_year integer,
 quantity integer not null check (quantity between 1 and 100),
 details text,
 photo_paths jsonb not null,
 unique(application_id,entry_number)
);
alter table public.contractor_equipment enable row level security;
revoke all on public.contractor_equipment from public, anon, authenticated;
grant all on public.contractor_equipment to service_role;
create table if not exists public.contractor_rate_limits (
 bucket text primary key,
 attempts integer not null default 1,
 expires_at timestamptz not null
);
alter table public.contractor_rate_limits enable row level security;
revoke all on public.contractor_rate_limits from public, anon, authenticated;
grant all on public.contractor_rate_limits to service_role;
create or replace function public.contractor_take_limit(key text,until_at timestamptz,maximum integer) returns boolean
language sql security invoker set search_path='' as $$
 insert into public.contractor_rate_limits as r(bucket,expires_at) values(key,until_at)
 on conflict(bucket) do update set attempts=r.attempts+1
 returning attempts<=maximum;
$$;
revoke all on function public.contractor_take_limit(text,timestamptz,integer) from public,anon,authenticated;
grant execute on function public.contractor_take_limit(text,timestamptz,integer) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('contractor-equipment','contractor-equipment',false,1048576,array['image/webp'])
on conflict(id) do nothing;
create index if not exists contractor_application_status_date on public.contractor_applications(status,created_at desc);
create index if not exists contractor_equipment_application on public.contractor_equipment(application_id);

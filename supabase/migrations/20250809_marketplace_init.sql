-- Core schema + seed (idempotent)

create extension if not exists pgcrypto;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('buyer','seller','both');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'billing_period') then
    create type billing_period as enum ('monthly','yearly');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type subscription_status as enum ('active','paused','canceled','past_due');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'pricing_type') then
    create type pricing_type as enum ('hourly','fixed');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  user_role user_role not null default 'buyer',
  phone text,
  city text,
  region text,
  country text,
  lat double precision,
  lng double precision,
  about text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all on public.profiles
for select using (true);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
for update using (auth.uid() = id);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  billing_period billing_period not null,
  price_cents integer not null default 0,
  listing_limit integer not null default 3,
  created_at timestamptz not null default now()
);
alter table public.plans enable row level security;

drop policy if exists plans_read on public.plans;
create policy plans_read on public.plans
for select using (true);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  status subscription_status not null default 'active',
  start_date date not null default current_date,
  end_date date,
  cancel_at date,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;

drop policy if exists subs_owner_select on public.subscriptions;
create policy subs_owner_select on public.subscriptions
for select using (auth.uid() = seller_id);

drop policy if exists subs_owner_insert on public.subscriptions;
create policy subs_owner_insert on public.subscriptions
for insert with check (auth.uid() = seller_id);

drop policy if exists subs_owner_update on public.subscriptions;
create policy subs_owner_update on public.subscriptions
for update using (auth.uid() = seller_id);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  sort smallint not null default 0
);

create table if not exists public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  slug text unique not null,
  name text not null,
  sort smallint not null default 0,
  is_active boolean not null default true
);

alter table public.categories enable row level security;
alter table public.subcategories enable row level security;

drop policy if exists cats_read on public.categories;
create policy cats_read on public.categories
for select using (true);

drop policy if exists subcats_read on public.subcategories;
create policy subcats_read on public.subcategories
for select using (true);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  subcategory_id uuid not null references public.subcategories(id),
  title text not null,
  description text not null,
  pricing_type pricing_type not null default 'hourly',
  price_cents integer not null,
  min_hours numeric(4,2) default 2.0,
  base_location_city text,
  lat double precision,
  lng double precision,
  coverage_radius_km numeric(5,2) default 25.0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_tsv tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(description,'')), 'B')
  ) stored
);
create index if not exists listings_tsv_idx on public.listings using gin (search_tsv);
create index if not exists listings_geo_idx on public.listings (lat, lng);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;$$;

drop trigger if exists listings_updated_at_trg on public.listings;
create trigger listings_updated_at_trg
before update on public.listings
for each row execute procedure public.set_updated_at();

alter table public.listings enable row level security;

create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  url text not null,
  position smallint not null default 1,
  created_at timestamptz not null default now()
);
alter table public.listing_images enable row level security;

create or replace view public.active_sellers as
select distinct s.seller_id
from public.subscriptions s
join public.plans p on p.id = s.plan_id
where s.status = 'active'
  and s.start_date <= current_date
  and (s.end_date is null or s.end_date >= current_date);

drop policy if exists listings_read on public.listings;
create policy listings_read on public.listings
for select using (true);

drop policy if exists listing_images_read on public.listing_images;
create policy listing_images_read on public.listing_images
for select using (true);

drop policy if exists listings_owner_insert_if_active on public.listings;
create policy listings_owner_insert_if_active on public.listings
for insert with check (
  auth.uid() = seller_id
  and exists (select 1 from public.active_sellers a where a.seller_id = auth.uid())
);

drop policy if exists listings_owner_update_if_active on public.listings;
create policy listings_owner_update_if_active on public.listings
for update using (
  auth.uid() = seller_id
  and exists (select 1 from public.active_sellers a where a.seller_id = auth.uid())
);

drop policy if exists listings_owner_delete on public.listings;
create policy listings_owner_delete on public.listings
for delete using (auth.uid() = seller_id);

drop policy if exists listing_images_owner_cud on public.listing_images;
create policy listing_images_owner_cud on public.listing_images
for all using (
  exists (select 1 from public.listings l
          where l.id = listing_id and l.seller_id = auth.uid())
) with check (
  exists (select 1 from public.listings l
          where l.id = listing_id and l.seller_id = auth.uid())
);

-- Seeds
insert into public.categories (slug,name,sort) values
  ('home-cleaning','Home Cleaning',1),
  ('lawn-yard','Lawn & Yard',2),
  ('snow-removal','Snow Removal',3),
  ('pet-care','Pet Care',4),
  ('handyman','Handyman',5)
on conflict (slug) do nothing;

insert into public.subcategories (category_id,slug,name,sort)
select id, x.slug, x.name, x.sort from public.categories c
join (values
  ('standard-clean','Standard Clean',1),
  ('deep-clean','Deep Clean',2),
  ('move-in-out','Move-in/Move-out',3),
  ('post-renovation','Post-renovation',4),
  ('rental-turnover','Short-term rental turnover',5),
  ('eco-clean','Eco-friendly products',6),
  ('after-party','After-party cleanup',7),
  ('windows-interior','Interior windows',8),
  ('carpet-shampoo','Carpet/Rug shampoo',9),
  ('upholstery-clean','Upholstery cleaning',10)
) as x(slug,name,sort) on c.slug='home-cleaning'
on conflict (slug) do nothing;

insert into public.subcategories (category_id,slug,name,sort)
select id, x.slug, x.name, x.sort from public.categories c
join (values
  ('mowing','Mowing',1),
  ('edging-trimming','Edging/Trimming',2),
  ('leaf-removal','Leaf removal',3),
  ('hedge-trim','Hedge/Small tree trimming',4),
  ('weeding','Garden weeding',5),
  ('planting-mulch','Garden planting/mulch',6),
  ('seasonal-cleanup','Spring/Fall cleanup',7),
  ('aeration','Aeration/Dethatching',8),
  ('gutter-clean','Gutter cleaning (ground-level)',9)
) as x(slug,name,sort) on c.slug='lawn-yard'
on conflict (slug) do nothing;

insert into public.subcategories (category_id,slug,name,sort)
select id, x.slug, x.name, x.sort from public.categories c
join (values
  ('driveway','Driveway plowing',1),
  ('walkway-steps','Walkway/Steps shoveling',2),
  ('entry-stairs','Entry & stairs',3),
  ('roof-raking','Roof raking',4),
  ('salting','Salting/De-icing',5),
  ('emergency','Emergency snow call',6)
) as x(slug,name,sort) on c.slug='snow-removal'
on conflict (slug) do nothing;

insert into public.subcategories (category_id,slug,name,sort)
select id, x.slug, x.name, x.sort from public.categories c
join (values
  ('walk-15','Dog walk 15 min',1),
  ('walk-30','Dog walk 30 min',2),
  ('walk-60','Dog walk 60 min',3),
  ('drop-in','Drop-in visit',4),
  ('overnight-sit','Overnight sitting (client home)',5),
  ('boarding','Boarding (sitter home)',6),
  ('daycare','Daycare',7),
  ('grooming-basic','Grooming (bath/nails)',8),
  ('litter-service','Litter box service',9),
  ('poop-scooping','Poop-scooping',10),
  ('pet-transport','Pet transport',11),
  ('training-basic','Basic training',12)
) as x(slug,name,sort) on c.slug='pet-care'
on conflict (slug) do nothing;

insert into public.subcategories (category_id,slug,name,sort)
select id, x.slug, x.name, x.sort from public.categories c
join (values
  ('furniture-assembly','Furniture assembly',1),
  ('tv-mounting','TV mounting',2),
  ('picture-hanging','Picture/mirror hanging',3),
  ('shelving-install','Shelving/closet install',4),
  ('light-fixture','Light fixture replace',5),
  ('faucet-replace','Faucet/showerhead replace',6),
  ('toilet-install','Toilet install',7),
  ('drywall-patch','Small drywall patch + paint',8),
  ('caulking','Caulking',9),
  ('smart-device','Smart lock/thermostat install',10),
  ('window-treatments','Window treatments',11),
  ('weatherstripping','Weatherstripping',12),
  ('pressure-washing','Pressure washing',13),
  ('other-small','Other small jobs <2h',99)
) as x(slug,name,sort) on c.slug='handyman'
on conflict (slug) do nothing;

insert into public.plans (code,name,billing_period,price_cents,listing_limit) values
  ('STARTER_M','Starter','monthly',0,3),
  ('PRO_M','Pro','monthly',1900,10),
  ('BUSINESS_M','Business','monthly',4900,30)
on conflict (code) do nothing;
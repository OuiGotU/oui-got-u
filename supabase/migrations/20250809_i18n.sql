create table if not exists public.categories_i18n (
  category_id uuid not null references public.categories(id) on delete cascade,
  locale text not null check (locale in ('en','fr')),
  name text not null,
  primary key (category_id, locale)
);
alter table public.categories_i18n enable row level security;

drop policy if exists cats_i18n_read on public.categories_i18n;
create policy cats_i18n_read on public.categories_i18n
for select using (true);

create table if not exists public.subcategories_i18n (
  subcategory_id uuid not null references public.subcategories(id) on delete cascade,
  locale text not null check (locale in ('en','fr')),
  name text not null,
  primary key (subcategory_id, locale)
);
alter table public.subcategories_i18n enable row level security;

drop policy if exists subcats_i18n_read on public.subcategories_i18n;
create policy subcats_i18n_read on public.subcategories_i18n
for select using (true);

create table if not exists public.listings_i18n (
  listing_id uuid not null references public.listings(id) on delete cascade,
  locale text not null check (locale in ('en','fr')),
  title text not null,
  description text not null,
  primary key (listing_id, locale)
);
alter table public.listings_i18n enable row level security;

drop policy if exists listings_i18n_read on public.listings_i18n;
create policy listings_i18n_read on public.listings_i18n
for select using (true);

drop policy if exists listings_i18n_cud on public.listings_i18n;
create policy listings_i18n_cud on public.listings_i18n
for all using (
  exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
) with check (
  exists (select 1 from public.listings l where l.id = listing_id and l.seller_id = auth.uid())
);

create or replace view public.v_categories_localized as
select c.id, c.slug, c.sort,
       coalesce(ci.name, c.name) as name,
       ci.locale as locale
from public.categories c
left join public.categories_i18n ci on ci.category_id = c.id;

create or replace view public.v_subcategories_localized as
select s.id, s.category_id, s.slug, s.sort,
       coalesce(si.name, s.name) as name,
       si.locale as locale
from public.subcategories s
left join public.subcategories_i18n si on si.subcategory_id = s.id;
-- SAYAN — schéma initial (SPEC §4, §5)
-- Catalogue en clair ; journal, pesées, objectifs et profil chiffrés côté client.

create table public.aliments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nom text not null,
  marque text,
  code_barres text,
  source text not null check (source in ('openfoodfacts', 'ciqual', 'manuel')),
  source_ref text,
  kcal_100g numeric not null,
  glucides_100g numeric not null,
  proteines_100g numeric not null,
  lipides_100g numeric not null,
  fibres_100g numeric,
  kcal_estimee boolean not null default false,
  archive boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.entrees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  payload jsonb not null
);

create table public.poids (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  payload jsonb not null,
  unique (user_id, date)
);

create table public.objectifs_mensuels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  mois date not null check (extract(day from mois) = 1),
  payload jsonb not null,
  unique (user_id, mois)
);

create table public.profil (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  verifier jsonb not null,
  payload jsonb not null
);

create index entrees_user_date on public.entrees (user_id, date);
-- poids (user_id, date) : couvert par la contrainte d'unicité
create index aliments_user_code_barres on public.aliments (user_id, code_barres);
create index aliments_user_nom on public.aliments (user_id, nom);

-- RLS : chaque ligne n'est visible et modifiable que par son propriétaire.
do $$
declare t text;
begin
  foreach t in array array['aliments', 'entrees', 'poids', 'objectifs_mensuels', 'profil'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      t || '_lecture', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      t || '_ecriture', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t || '_mise_a_jour', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
      t || '_suppression', t);
  end loop;
end $$;

-- Indique si le compte unique existe déjà, pour choisir entre initialisation et déverrouillage.
-- Ne révèle qu'un booléen.
create function public.compte_existe()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from auth.users);
$$;

revoke all on function public.compte_existe() from public;
grant execute on function public.compte_existe() to anon, authenticated;

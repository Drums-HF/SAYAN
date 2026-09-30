-- TRUNCATE contourne RLS : ne laisser au rôle authenticated que les quatre opérations couvertes par les politiques.
do $$
declare t text;
begin
  foreach t in array array['aliments', 'entrees', 'poids', 'objectifs_mensuels', 'profil'] loop
    execute format('revoke truncate, references, trigger on public.%I from authenticated', t);
  end loop;
end $$;

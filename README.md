# SAYAN

Application web personnelle de suivi nutritionnel, installée en PWA sur iPhone.
Données de santé chiffrées de bout en bout dans le navigateur (AES-GCM, clé dérivée du mot de passe).

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement. Aperçu sur données fictives : `#/apercu/journal`, `#/apercu-init`. |
| `npm run lint` | Lint (oxlint). |
| `npm test` | Tests unitaires (Vitest). |
| `npm run build` | Vérification des types et build de production. |
| `npm run db:push` | Applique `supabase/migrations/` au projet (connexion directe, sinon pooler en mode session). |
| `npm run test:rls` | Tests d'intégration contre le vrai projet : RLS, authentification, stockage chiffré. |
| `npm run ciqual` | Régénère `public/ciqual.json` depuis `data/ciqual-2025.xlsx` (table ANSES). |
| `node scripts/icones.ts` | Régénère les icônes PWA. |

`db:push` et `test:rls` lisent `.env.local` (jamais versionné) :

```
SUPABASE_PROJECT_REF=…
SUPABASE_DB_PASSWORD=…
VITE_SUPABASE_URL=https://….supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_…
```

## Déploiement

Un push sur `main` lance le workflow : lint → tests → build → GitHub Pages.
Le build lit les secrets du dépôt `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
(valeurs publiques par conception : la clé publique ne donne accès à rien sans authentification).

## Sources de données

- Table Ciqual 2025, ANSES — Licence Ouverte Etalab.
- Open Food Facts — licence ODbL.

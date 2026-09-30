#!/usr/bin/env bash
# Applique les migrations de supabase/migrations/ au projet distant.
# Connexion directe ; en cas d'échec réseau, pooler en mode session (port 5432).
# Usage : npm run db:push [-- --dry-run]
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env.local; set +a

direct="postgresql://postgres:${SUPABASE_DB_PASSWORD}@db.${SUPABASE_PROJECT_REF}.supabase.co:5432/postgres"
if npx supabase db push --db-url "$direct" "$@"; then
  exit 0
fi

: "${SUPABASE_POOLER_HOST:?Connexion directe impossible : définir SUPABASE_POOLER_HOST dans .env.local}"
echo "Connexion directe impossible, bascule sur le pooler (mode session)."
pooler="postgresql://postgres.${SUPABASE_PROJECT_REF}:${SUPABASE_DB_PASSWORD}@${SUPABASE_POOLER_HOST}:5432/postgres"
npx supabase db push --db-url "$pooler" "$@"

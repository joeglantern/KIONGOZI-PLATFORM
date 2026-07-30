#!/usr/bin/env bash
# Self-verifying deploy for the Kiongozi API (run on the VPS).
#
#   cd ~/kiongozi-api/api-server && bash deploy.sh
#
# Guards against every failure mode we've actually been burned by:
#   1. "Already up to date" because commits were never pushed from the dev machine
#   2. Missing .env variables discovered only as runtime 500s
#   3. Rebuilding old code and assuming the new code is live
# It verifies the running container AND the public domain report the exact
# commit that was just deployed.
#
# Flags: --force   deploy even if git pull brought nothing new (e.g. env-only change)

set -euo pipefail
cd "$(dirname "$0")"

FORCE=0
[ "${1:-}" = "--force" ] && FORCE=1

echo "── 1/5 Pulling latest code ──────────────────────────────"
BEFORE=$(git rev-parse --short HEAD)
git pull --ff-only
AFTER=$(git rev-parse --short HEAD)

if [ "$BEFORE" = "$AFTER" ] && [ "$FORCE" -ne 1 ]; then
  DEPLOYED=$(curl -s -m 5 http://127.0.0.1:3001/api/v1/health | grep -o '"commit":"[^"]*"' | cut -d'"' -f4 || true)
  if [ "$DEPLOYED" = "$AFTER" ]; then
    echo "✅ Nothing to do: commit $AFTER is already deployed and running."
    exit 0
  fi
  echo ""
  echo "⚠️  git pull brought NOTHING NEW (still at $BEFORE)."
  echo "    If you just made changes: did you 'git push' from your dev machine?"
  echo "    Running container reports commit: ${DEPLOYED:-unreachable}"
  echo "    To rebuild this commit anyway: bash deploy.sh --force"
  exit 1
fi

echo "Deploying commit: $AFTER (was: $BEFORE)"

echo "── 2/5 Checking .env ────────────────────────────────────"
MISSING=""
for VAR in SUPABASE_URL SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY DATABASE_URL JWT_SECRET OPENAI_API_KEY; do
  grep -q "^${VAR}=" .env || MISSING="$MISSING $VAR"
done
if [ -n "$MISSING" ]; then
  echo "⛔ .env is missing:$MISSING"
  echo "   Add them (copy from your dev machine's api-server/.env), then re-run."
  exit 1
fi
echo "✅ .env has all required variables"

echo "── 3/5 Building image ───────────────────────────────────"
GIT_SHA=$AFTER docker compose build

echo "── 4/5 Starting container ───────────────────────────────"
GIT_SHA=$AFTER docker compose up -d --remove-orphans

echo "── 5/5 Verifying deployment ─────────────────────────────"
for i in $(seq 1 18); do
  sleep 5
  HEALTH=$(curl -s -m 5 http://127.0.0.1:3001/api/v1/health || true)
  if [ -n "$HEALTH" ]; then
    RUNNING=$(echo "$HEALTH" | grep -o '"commit":"[^"]*"' | cut -d'"' -f4 || true)
    if [ "$RUNNING" = "$AFTER" ]; then
      echo "✅ CONTAINER VERIFIED: healthy and running commit $AFTER"
      PUBLIC=$(curl -s -m 10 https://api.kiongozi.org/api/v1/health | grep -o '"commit":"[^"]*"' | cut -d'"' -f4 || true)
      if [ "$PUBLIC" = "$AFTER" ]; then
        echo "✅ PUBLIC DOMAIN VERIFIED: api.kiongozi.org is serving commit $AFTER"
      else
        echo "⚠️  api.kiongozi.org reports '${PUBLIC:-unreachable}' — check host nginx routing!"
        exit 1
      fi
      echo "── startup log highlights ──"
      docker logs kiongozi-api --since 2m 2>&1 | grep -E "Environment|MISSING|Server running|⛔|⚠️|✅" | head -10 || true
      echo ""
      echo "🎉 Deploy complete and verified."
      exit 0
    fi
  fi
  echo "   waiting for container... ($((i * 5))s)"
done

echo "⛔ Deploy verification FAILED — container never became healthy or reports the wrong commit."
echo "   Inspect: docker logs kiongozi-api --tail 50"
exit 1

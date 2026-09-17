#!/bin/sh
set -eu

install_key="$(sha256sum package.json pnpm-lock.yaml pnpm-workspace.yaml | sha256sum | cut -d ' ' -f 1)"
stamp_file="node_modules/.finance-tracker-dev-install"

if [ ! -f "$stamp_file" ] || [ "$(cat "$stamp_file")" != "$install_key" ]; then
  pnpm install --frozen-lockfile --prefer-offline --store-dir /pnpm/store
  printf '%s\n' "$install_key" > "$stamp_file"
fi

./node_modules/.bin/prisma generate
chown -R "${HOST_UID:-1000}:${HOST_GID:-1000}" src/generated/prisma
./node_modules/.bin/prisma migrate deploy
./node_modules/.bin/tsx scripts/bootstrap-owner.ts
exec ./node_modules/.bin/next dev --hostname 0.0.0.0

FROM node:24-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ENV DATABASE_URL=postgresql://finance:build-only@localhost:5432/finance_tracker
ENV BETTER_AUTH_SECRET=build-only-secret-that-is-over-32-characters
ENV BETTER_AUTH_URL=http://localhost:3000
RUN pnpm db:generate && pnpm build

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/src/lib ./src/lib
COPY --from=build /app/src/generated ./src/generated
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && ./node_modules/.bin/tsx scripts/bootstrap-owner.ts && node server.js"]

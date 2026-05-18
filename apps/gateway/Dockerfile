FROM node:20-alpine AS base
RUN npm install -g pnpm@9
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/gateway/package.json ./apps/gateway/
COPY libs/shared/types/package.json ./libs/shared/types/
COPY libs/shared/utils/package.json ./libs/shared/utils/
COPY libs/domain/package.json ./libs/domain/
COPY libs/graphql/package.json ./libs/graphql/
RUN pnpm install --frozen-lockfile --ignore-scripts --shamefully-hoist

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Compile @teste-manuel/graphql lib to dist/
RUN npx tsc --moduleResolution node --module commonjs --outDir libs/graphql/dist --target ES2020 --esModuleInterop true --skipLibCheck true libs/graphql/src/index.ts
WORKDIR /app/apps/gateway
RUN pnpm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/gateway/dist ./dist
COPY --from=build /app/node_modules ./node_modules
# Copy libs with compiled output so @teste-manuel/* resolution works
COPY --from=build /app/libs/graphql ./libs/graphql
EXPOSE 4000
CMD ["node", "dist/apps/gateway/src/index.js"]

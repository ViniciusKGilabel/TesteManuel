FROM node:20-alpine AS base
RUN npm install -g pnpm@9
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/auth-service/package.json ./apps/auth-service/
COPY libs/shared/types/package.json ./libs/shared/types/
COPY libs/shared/utils/package.json ./libs/shared/utils/
COPY libs/domain/package.json ./libs/domain/
COPY libs/graphql/package.json ./libs/graphql/
RUN pnpm install --frozen-lockfile --ignore-scripts --shamefully-hoist

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
WORKDIR /app/apps/auth-service
RUN pnpm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=build /app/apps/auth-service/dist ./dist
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "dist/apps/auth-service/src/main.js"]

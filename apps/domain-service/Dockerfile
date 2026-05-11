FROM node:20-alpine AS base
RUN npm install -g pnpm@9
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/domain-service/package.json ./apps/domain-service/
COPY libs/shared/types/package.json ./libs/shared/types/
COPY libs/shared/utils/package.json ./libs/shared/utils/
COPY libs/domain/package.json ./libs/domain/
COPY libs/graphql/package.json ./libs/graphql/
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
WORKDIR /app/apps/domain-service
RUN pnpm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=build /app/apps/domain-service/dist ./dist
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3002
CMD ["node", "dist/main.js"]

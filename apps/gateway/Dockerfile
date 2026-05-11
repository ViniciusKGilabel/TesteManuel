FROM node:20-alpine AS base
RUN npm install -g pnpm@9
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/gateway/package.json ./apps/gateway/
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY apps/gateway ./apps/gateway
WORKDIR /app/apps/gateway
RUN pnpm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=build /app/apps/gateway/dist ./dist
COPY --from=build /app/node_modules ./node_modules
EXPOSE 4000
CMD ["node", "dist/index.js"]

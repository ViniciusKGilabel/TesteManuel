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
RUN pnpm install --frozen-lockfile --ignore-scripts --shamefully-hoist

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Compile shared libs to dist/ before building the service
RUN npx tsc --moduleResolution node --module commonjs --outDir libs/domain/dist --target ES2020 --esModuleInterop true --skipLibCheck true --experimentalDecorators true libs/domain/src/index.ts
RUN npx tsc --moduleResolution node --module commonjs --outDir libs/shared/utils/dist --target ES2020 --esModuleInterop true --skipLibCheck true libs/shared/utils/src/index.ts
WORKDIR /app/apps/domain-service
RUN pnpm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/domain-service/dist ./dist
COPY --from=build /app/node_modules ./node_modules
# Copy compiled libs so @teste-manuel/* resolution works via node_modules symlinks
COPY --from=build /app/libs/domain ./libs/domain
COPY --from=build /app/libs/shared/utils ./libs/shared/utils
EXPOSE 3002
CMD ["node", "dist/apps/domain-service/src/main.js"]

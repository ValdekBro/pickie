FROM node:20-slim AS base

ENV NODE_ENV=production \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false

WORKDIR /app

# Build stage with dev dependencies for the API only
FROM node:20-slim AS build
WORKDIR /app
ENV NODE_ENV=development
COPY api/package.json ./package.json
RUN npm install --no-audit --loglevel=error
RUN npm install --no-audit --no-save --loglevel=error typescript @types/node
COPY tsconfig.base.json tsconfig.json ./
COPY api ./api
WORKDIR /app/api
RUN npm run build

# Runtime
FROM base AS runtime
WORKDIR /app
COPY --from=build /app/api/dist ./dist
COPY api/package.json ./package.json
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
RUN npm install --omit=dev --no-audit --loglevel=error
EXPOSE 3000
CMD ["node", "dist/main.js"]



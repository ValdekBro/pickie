FROM node:20-slim AS base

ENV NODE_ENV=production \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false

WORKDIR /app

# Build with dev deps for datasource
FROM node:20-slim AS build
WORKDIR /app
ENV NODE_ENV=development
COPY datasource/package.json ./package.json
RUN npm install --no-audit --loglevel=error
RUN npm install --no-audit --no-save --loglevel=error typescript @types/node
COPY tsconfig.base.json tsconfig.json ./
COPY datasource ./datasource
WORKDIR /app/datasource
RUN npm run build

# Runtime
FROM base AS runtime
WORKDIR /app
COPY --from=build /app/datasource/dist ./dist
COPY datasource/package.json ./package.json
RUN npm install --omit=dev --no-audit --loglevel=error
CMD ["node", "dist/index.js"]

FROM node:20-alpine AS deps
WORKDIR /app
# Copy root and workspace manifests for better caching
COPY package.json ./
COPY packages/common/package.json packages/common/package.json
COPY services/gateway/package.json services/gateway/package.json
COPY services/auth/package.json services/auth/package.json
COPY services/events/package.json services/events/package.json
COPY services/orders/package.json services/orders/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --workspaces || npm install --no-package-lock --workspaces

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY packages/common ./packages/common
COPY services/gateway ./services/gateway
# Build just common and gateway
RUN npm run -w packages/common build && npm run -w services/gateway build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# Copy entire repo (built) so workspace links resolve
COPY --from=build /app /app
EXPOSE 8080
USER node
CMD ["node", "services/gateway/dist/index.js"]



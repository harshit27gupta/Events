FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
COPY packages/common/package.json packages/common/package.json
COPY services/orders/package.json services/orders/package.json
RUN npm install --workspaces || npm install --no-package-lock --workspaces

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY packages/common ./packages/common
COPY services/orders ./services/orders
RUN npm run -w packages/common build && npm run -w services/orders build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 4003
CMD ["node", "services/orders/dist/index.js"]



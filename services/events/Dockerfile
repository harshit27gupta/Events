FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
COPY packages/common/package.json packages/common/package.json
COPY services/events/package.json services/events/package.json
RUN npm install --workspaces || npm install --no-package-lock --workspaces

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY packages/common ./packages/common
COPY services/events ./services/events
RUN npm run -w packages/common build && npm run -w services/events build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
EXPOSE 4002
CMD ["node", "services/events/dist/index.js"]



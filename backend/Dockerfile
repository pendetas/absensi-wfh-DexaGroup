# One image for all four services; each container picks its entry point with `command`.

# Full dependencies: compiles the services, and runs migrations and the seed (they need ts-node).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production dependencies and the compiled output only.
FROM node:22-alpine AS runtime
RUN apk add --no-cache tzdata
ENV NODE_ENV=production \
    TZ=Asia/Jakarta
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# The photo volume is mounted here; it inherits this owner on first use.
RUN mkdir -p /app/uploads && chown node:node /app/uploads
USER node
CMD ["node", "dist/apps/api-gateway/main"]

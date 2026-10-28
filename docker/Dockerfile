# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --non-interactive --ignore-scripts
COPY . .
RUN yarn build

FROM node:22-bookworm-slim AS runtime
ARG VCS_REF=unknown
LABEL org.opencontainers.image.title="what-happen" \
      org.opencontainers.image.source="https://github.com/LYX9527/what-happen" \
      org.opencontainers.image.revision="${VCS_REF}"
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
COPY --from=build --chown=node:node /app/.output ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/platforms').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "server/index.mjs"]

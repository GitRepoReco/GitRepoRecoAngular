# syntax=docker/dockerfile:1
# Image de l'application RepoReco (Angular 20) — lancée avec `npm start` (ng serve)
# Node 22 : compatible avec Angular CLI 20 (>= 22.12 requis)
FROM node:22-bookworm-slim

ARG APP_VERSION=dev

ENV APP_VERSION=${APP_VERSION}

# NODE_ENV=development est indispensable : @angular/cli et @angular/build sont des devDependencies,
# elles ne seraient pas installées avec NODE_ENV=production.
# max-old-space-size garde le heap de Node (~1,5 Go) sous la limite de 2 Go du conteneur.
ENV NODE_ENV=development \
    NG_CLI_ANALYTICS=false \
    NODE_OPTIONS=--max-old-space-size=1536 \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    PORT=4200

# Toute l'application vit sous /app (propriété de l'utilisateur non-root "node")
WORKDIR /app
RUN mkdir -p /app/node_modules && chown -R node:node /app

COPY --chown=node:node . /app
COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

USER node
EXPOSE 4200

# Au démarrage : npm install, puis npm start (voir docker-entrypoint.sh)
ENTRYPOINT ["docker-entrypoint.sh"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4200/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
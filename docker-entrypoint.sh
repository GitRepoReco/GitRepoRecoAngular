#!/bin/sh
set -eu
cd /app

echo "[docker] npm install..."
npm install --no-audit --no-fund

echo "[docker] npm start (port ${PORT})..."
# --host 0.0.0.0        : écouter sur toutes les interfaces (sinon inaccessible hors du conteneur)
# --allowed-hosts=true  : accepter n'importe quel nom d'hôte (domaine, IP, reverse proxy)
exec npm start -- --host 0.0.0.0 --port "${PORT}" --allowed-hosts=true

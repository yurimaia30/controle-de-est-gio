#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
if [[ ! -f public/index.html || ! -f firebase.json ]]; then
  printf '%s\n' 'Pacote incompleto: mantenha a pasta public junto deste script.' >&2
  exit 1
fi
printf '%s\n' 'Publicando somente o aplicativo no projeto controle-de-estagio.'
if command -v firebase >/dev/null 2>&1; then
  firebase deploy --project controle-de-estagio --only hosting --config firebase.json
else
  npx --yes firebase-tools deploy --project controle-de-estagio --only hosting --config firebase.json
fi
printf '%s\n' 'Publicação finalizada: https://controle-de-estagio.web.app/'

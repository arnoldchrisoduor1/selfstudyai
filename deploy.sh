#!/usr/bin/env bash
# Deploy Self Study to the wilderness droplet.
# Web:  https://ssai.digital-wilderness.org
# API:  https://ssaiapi.digital-wilderness.org
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SSH_HOST="${DEPLOY_SSH_HOST:-wilderness-deploy}"
REMOTE_DIR="${DEPLOY_REMOTE_DIR:-/opt/selfstudy}"
WEB_DOMAIN="${DEPLOY_WEB_DOMAIN:-ssai.digital-wilderness.org}"
API_DOMAIN="${DEPLOY_API_DOMAIN:-ssaiapi.digital-wilderness.org}"
API_IMAGE="${DEPLOY_API_IMAGE:-selfstudy-api:prod}"
WEB_IMAGE="${DEPLOY_WEB_IMAGE:-selfstudy-web:prod}"
TAR="${TMPDIR:-/tmp}/selfstudy-images.tar"

ssh_cmd() {
  ssh -o BatchMode=yes -o ConnectTimeout=20 "$SSH_HOST" "$@"
}

need_docker() {
  command -v docker >/dev/null || { echo "docker missing locally"; exit 1; }
}

build_local() {
  need_docker
  echo "build api image $API_IMAGE"
  docker build -f "$ROOT/infra/Dockerfile.api" -t "$API_IMAGE" "$ROOT"
  echo "build web image $WEB_IMAGE (api=$API_DOMAIN)"
  docker build -f "$ROOT/infra/Dockerfile.web" \
    --build-arg NEXT_PUBLIC_API_BASE_URL="https://${API_DOMAIN}" \
    --build-arg NEXT_PUBLIC_BASE_PATH= \
    -t "$WEB_IMAGE" "$ROOT"
  echo "local images ready"
}

test_ssh() {
  echo "ssh $SSH_HOST"
  ssh_cmd 'echo connected; whoami; hostname; docker --version; nginx -v'
}

check_ssl() {
  echo "remote certs"
  ssh_cmd 'certbot certificates 2>/dev/null | sed -n "1,160p"' || true
  echo "live names"
  echo | openssl s_client -servername "$WEB_DOMAIN" -connect "${WEB_DOMAIN}:443" 2>/dev/null \
    | openssl x509 -noout -subject -ext subjectAltName 2>/dev/null || echo "no tls yet for $WEB_DOMAIN"
  echo | openssl s_client -servername "$API_DOMAIN" -connect "${API_DOMAIN}:443" 2>/dev/null \
    | openssl x509 -noout -subject -ext subjectAltName 2>/dev/null || echo "no tls yet for $API_DOMAIN"
}

transfer_and_up() {
  need_docker
  echo "save images"
  docker save -o "$TAR" "$API_IMAGE" "$WEB_IMAGE"
  echo "copy images + compose + nginx"
  ssh_cmd "mkdir -p '$REMOTE_DIR'"
  scp -o BatchMode=yes "$TAR" "$SSH_HOST:$REMOTE_DIR/images.tar"
  scp -o BatchMode=yes "$ROOT/docker-compose.prod.yml" "$SSH_HOST:$REMOTE_DIR/docker-compose.prod.yml"
  scp -o BatchMode=yes "$ROOT/deploy/nginx/ssai.conf" "$SSH_HOST:/etc/nginx/sites-available/ssai"
  echo "load + compose up"
  ssh_cmd "docker load -i '$REMOTE_DIR/images.tar' && cd '$REMOTE_DIR' && docker compose -f docker-compose.prod.yml up -d"
  echo "nginx site"
  ssh_cmd 'ln -sfn /etc/nginx/sites-available/ssai /etc/nginx/sites-enabled/ssai && nginx -t && systemctl reload nginx'
  issue_certs
}

issue_certs() {
  local email="${CERTBOT_EMAIL:-}"
  if [[ -z "$email" ]]; then
    email="$(ssh_cmd 'python3 - <<"PY"
import json, glob
for path in glob.glob("/etc/letsencrypt/accounts/*/regr.json"):
    try:
        data = json.load(open(path, encoding="utf-8"))
    except Exception:
        continue
    body = data.get("body") or data
    contact = body.get("contact") or []
    for item in contact:
        if isinstance(item, str) and item.startswith("mailto:"):
            print(item.split("mailto:", 1)[1])
            raise SystemExit
PY' || true)"
  fi
  if [[ -z "$email" ]]; then
    echo "no CERTBOT_EMAIL and no existing account email; skip cert issue"
    return 0
  fi
  echo "certbot for $WEB_DOMAIN $API_DOMAIN"
  ssh_cmd "certbot --nginx -d '$WEB_DOMAIN' -d '$API_DOMAIN' --non-interactive --agree-tos -m '$email' --redirect" \
    || echo "certbot failed; http sites still up"
}

verify_remote() {
  echo "containers"
  ssh_cmd 'docker ps --filter name=ssai- --format "{{.Names}} {{.Status}} {{.Ports}}"'
  echo "local binds"
  ssh_cmd 'curl -fsS -o /dev/null -w "api_healthz:%{http_code}\n" http://127.0.0.1:18280/healthz || echo api_healthz:fail'
  ssh_cmd 'curl -fsS -o /dev/null -w "web:%{http_code}\n" http://127.0.0.1:18281/ || echo web:fail'
  echo "public"
  curl -fsS -o /dev/null -w "public_web:%{http_code}\n" "https://${WEB_DOMAIN}/" || curl -fsS -o /dev/null -w "public_web_http:%{http_code}\n" "http://${WEB_DOMAIN}/" || echo public_web:fail
  curl -fsS -o /dev/null -w "public_api:%{http_code}\n" "https://${API_DOMAIN}/healthz" || curl -fsS -o /dev/null -w "public_api_http:%{http_code}\n" "http://${API_DOMAIN}/healthz" || echo public_api:fail
  check_ssl
}

do_all() {
  test_ssh
  build_local
  transfer_and_up
  verify_remote
}

menu() {
  cat <<EOF
Self Study deploy
  host: $SSH_HOST
  web:  $WEB_DOMAIN
  api:  $API_DOMAIN

  1  build backend + frontend locally
  2  test ssh
  3  check ssl certificates
  4  transfer, start containers, nginx, certs
  5  verify containers, ssh, certs, http
  6  everything (1-5)
  q  quit
EOF
  read -r -p "> " choice
  case "$choice" in
    1) build_local ;;
    2) test_ssh ;;
    3) check_ssl ;;
    4) transfer_and_up ;;
    5) verify_remote ;;
    6) do_all ;;
    q|Q) exit 0 ;;
    *) echo "unknown"; exit 1 ;;
  esac
}

case "${1:-menu}" in
  menu) menu ;;
  build) build_local ;;
  ssh) test_ssh ;;
  ssl) check_ssl ;;
  up) transfer_and_up ;;
  verify) verify_remote ;;
  all) do_all ;;
  *) echo "use: deploy.sh [menu|build|ssh|ssl|up|verify|all]"; exit 1 ;;
esac

#!/usr/bin/env bash
# Installs WordPress, WooCommerce, WooCommerce PayPal Payments and one 10.00 USD product into the local containers.
# NOT TESTED by me. If a command fails, copy the exact error to me: that is useful information.
set -euo pipefail
cd "$(dirname "$0")"
PASS="$(od -An -N16 -tx1 /dev/urandom | tr -d ' \n')"   # 32 hex chars; no early-closing pipeline under pipefail
docker compose up -d db wordpress
echo "Waiting for WordPress files and database..."; sleep 25
wp() { docker compose run --rm -T cli wp "$@"; }
for i in $(seq 1 20); do wp core is-installed >/dev/null 2>&1 && break; wp core install --url=http://localhost:8080 --title="S0A Test Store" --admin_user=admin --admin_password="$PASS" --admin_email=admin@example.test --skip-email >/dev/null 2>&1 && break; sleep 5; done
wp core update >/dev/null 2>&1 || true     # WooCommerce can require a newer WordPress than the image ships (seen on the first real run)
wp plugin install woocommerce --activate
wp plugin install woocommerce-paypal-payments --activate
wp rewrite structure '/%postname%/' --hard      # /wp-json needs pretty permalinks
wp option update woocommerce_currency USD
wp option update woocommerce_default_country 'US:CA'
wp wc product create --name="S0A Test Product" --type=simple --regular_price=10.00 --user=admin
echo
echo "Site:  http://localhost:8080      Admin: http://localhost:8080/wp-admin"
echo "Admin user: admin   Password: $PASS   (local throwaway; shown once)"
echo "Next: WooCommerce > Settings > Payments > PayPal: sandbox mode + sandbox credentials. See docs/S0A-RUNBOOK.md."

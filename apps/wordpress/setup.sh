#!/bin/bash

WP_PATH=/var/www/html
WP_SRC=/usr/src/wordpress
WP_URL="${WORDPRESS_URL:-http://localhost:8080}"
WP_TITLE="${WORDPRESS_TITLE:-TesteManuel Store}"
WP_ADMIN_USER="${WP_ADMIN_USER:-admin}"
WP_ADMIN_PASS="${WP_ADMIN_PASS:-admin_pass}"
WP_ADMIN_EMAIL="${WP_ADMIN_EMAIL:-admin@example.com}"
DB_HOST="${WORDPRESS_DB_HOST:-wp-db}"
DB_USER="${WORDPRESS_DB_USER:-wp_user}"
DB_PASS="${WORDPRESS_DB_PASSWORD:-wp_pass}"
DB_NAME="${WORDPRESS_DB_NAME:-wordpress}"

# 1. Wait for MySQL — no wp-config.php needed
until mysqladmin ping -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" --ssl=false --silent 2>/dev/null; do
  echo "Waiting for database..."
  sleep 3
done
echo "Database ready."

# 2. Copy WordPress core files if not present (they live in /usr/src/wordpress in the image)
if [ ! -f "$WP_PATH/wp-settings.php" ]; then
  echo "Copying WordPress core files..."
  cp -a "$WP_SRC/." "$WP_PATH/"
  chown -R www-data:www-data "$WP_PATH"
  echo "WordPress files copied."
fi

# 3. Create wp-config.php if missing
if [ ! -f "$WP_PATH/wp-config.php" ]; then
  echo "Creating wp-config.php..."
  wp --allow-root config create \
    --path="$WP_PATH" \
    --dbname="$DB_NAME" \
    --dbuser="$DB_USER" \
    --dbpass="$DB_PASS" \
    --dbhost="$DB_HOST" \
    --dbprefix=wp_
fi

# 4. Install WordPress if not already done
if ! wp --allow-root core is-installed --path="$WP_PATH" 2>/dev/null; then
  echo "Installing WordPress..."
  wp --allow-root core install \
    --path="$WP_PATH" \
    --url="$WP_URL" \
    --title="$WP_TITLE" \
    --admin_user="$WP_ADMIN_USER" \
    --admin_password="$WP_ADMIN_PASS" \
    --admin_email="$WP_ADMIN_EMAIL" \
    --skip-email
  echo "WordPress installed."
else
  echo "WordPress already installed."
fi

# 5. Install and activate plugins
echo "Installing plugins..."
wp --allow-root plugin install wp-graphql --activate --path="$WP_PATH" 2>/dev/null || true
wp --allow-root plugin install woocommerce --activate --path="$WP_PATH" 2>/dev/null || true
wp --allow-root plugin install wp-graphql-woocommerce --activate --path="$WP_PATH" 2>/dev/null || true
wp --allow-root plugin activate graphql-federation --path="$WP_PATH" 2>/dev/null || true
wp --allow-root plugin activate tm-internal-api --path="$WP_PATH" 2>/dev/null || true

# 6. Store internal secret in wp-config.php as a constant (idempotent)
INTERNAL_SECRET="${WC_INTERNAL_SECRET:-dev-internal-secret-32chars!!!!!}"
if ! wp --allow-root config has TM_INTERNAL_SECRET --path="$WP_PATH" 2>/dev/null; then
  wp --allow-root config set TM_INTERNAL_SECRET "$INTERNAL_SECRET" --type=constant --path="$WP_PATH"
fi

# 7. Enable pretty permalinks for REST API routing
wp --allow-root option update permalink_structure '/%postname%/' --path="$WP_PATH" 2>/dev/null || true
wp --allow-root rewrite flush --path="$WP_PATH" 2>/dev/null || true

echo "Setup complete. Active plugins:"
wp --allow-root plugin list --status=active --path="$WP_PATH" 2>/dev/null || true

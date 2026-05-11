#!/bin/bash
set -e

WP_URL="${WORDPRESS_URL:-http://localhost:8080}"
WP_TITLE="${WORDPRESS_TITLE:-TesteManuel Store}"
WP_ADMIN_USER="${WP_ADMIN_USER:-admin}"
WP_ADMIN_PASS="${WP_ADMIN_PASS:-admin_pass}"
WP_ADMIN_EMAIL="${WP_ADMIN_EMAIL:-admin@example.com}"

# Wait for MySQL to be ready
until wp --allow-root db check --path=/var/www/html 2>/dev/null; do
  echo "Waiting for database..."
  sleep 3
done

# Skip if already installed
if wp --allow-root core is-installed --path=/var/www/html 2>/dev/null; then
  echo "WordPress already installed, activating plugins..."
else
  echo "Installing WordPress..."
  wp --allow-root core install \
    --path=/var/www/html \
    --url="$WP_URL" \
    --title="$WP_TITLE" \
    --admin_user="$WP_ADMIN_USER" \
    --admin_password="$WP_ADMIN_PASS" \
    --admin_email="$WP_ADMIN_EMAIL" \
    --skip-email

  # Install WPGraphQL
  wp --allow-root plugin install wp-graphql --activate --path=/var/www/html

  # Activate our federation plugin
  wp --allow-root plugin activate graphql-federation --path=/var/www/html

  # Create sample content
  wp --allow-root post create \
    --path=/var/www/html \
    --post_title="Welcome to TesteManuel" \
    --post_content="Our e-commerce platform is live. Browse products and place orders through our GraphQL API." \
    --post_status=publish

  wp --allow-root post create \
    --path=/var/www/html \
    --post_title="How to Use the API" \
    --post_content="Access the GraphQL playground at /graphql to explore our federated schema." \
    --post_status=publish

  wp --allow-root term create category "E-Commerce" \
    --path=/var/www/html \
    --description="E-commerce related posts"

  wp --allow-root term create category "Tech" \
    --path=/var/www/html \
    --description="Technology articles"

  echo "WordPress setup complete."
fi

# Ensure plugins active after any restart
wp --allow-root plugin activate wp-graphql graphql-federation --path=/var/www/html 2>/dev/null || true

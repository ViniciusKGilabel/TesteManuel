FROM wordpress:6.4-apache

# Install WP-CLI
RUN curl -o /usr/local/bin/wp https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar \
    && chmod +x /usr/local/bin/wp \
    && apt-get update && apt-get install -y less default-mysql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy federation plugin
COPY plugins/graphql-federation /var/www/html/wp-content/plugins/graphql-federation

# Copy setup script
COPY setup.sh /usr/local/bin/wp-setup.sh
RUN chmod +x /usr/local/bin/wp-setup.sh

EXPOSE 80

# Start apache in background, run WP-CLI setup once DB is ready, then keep apache in foreground
CMD bash -c "\
    apache2-foreground &\
    sleep 10 &&\
    wp-setup.sh &&\
    wait"

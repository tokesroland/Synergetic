FROM php:8.2-apache

# PHP kiterjesztések: PDO + MySQL
RUN docker-php-ext-install pdo pdo_mysql

# mod_rewrite engedélyezése
RUN a2enmod rewrite

# DocumentRoot közvetlen beállítása
RUN echo '<VirtualHost *:80>\n\
    DocumentRoot /var/www/html\n\
    <Directory /var/www/html>\n\
        AllowOverride All\n\
        Require all granted\n\
    </Directory>\n\
</VirtualHost>' > /etc/apache2/sites-enabled/000-default.conf

# Feltöltési mappa
RUN mkdir -p /var/www/html/uploads \
    && chown -R www-data:www-data /var/www/html/uploads \
    && chmod -R 775 /var/www/html/uploads

# Projekt fájlok másolása
COPY . /var/www/html/

EXPOSE 80

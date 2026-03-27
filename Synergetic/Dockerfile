FROM php:8.2-apache

# PHP kiterjesztések: PDO + MySQL
RUN docker-php-ext-install pdo pdo_mysql

# mod_rewrite engedélyezése (opcionális, de hasznos)
RUN a2enmod rewrite

# Feltöltési mappa jogosultsága
RUN mkdir -p /var/www/html/uploads \
    && chown -R www-data:www-data /var/www/html/uploads \
    && chmod -R 775 /var/www/html/uploads

# Projekt fájlok másolása
COPY . /var/www/html/

# Apache document root beállítása
ENV APACHE_DOCUMENT_ROOT /var/www/html

RUN sed -ri 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' \
    /etc/apache2/sites-available/*.conf \
    /etc/apache2/apache2.conf \
    /etc/apache2/conf-available/*.conf

EXPOSE 80

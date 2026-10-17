FROM php:8.4-cli
RUN docker-php-ext-install pdo_mysql
WORKDIR /project
COPY . /project
CMD ["sh", "demo/serve.sh"]

FROM php:8.4-cli
RUN apt-get update && apt-get install -y --no-install-recommends git curl unzip bash && rm -rf /var/lib/apt/lists/*
RUN docker-php-ext-install pdo_mysql
WORKDIR /project
COPY . /project
CMD ["sh", "demo/serve.sh"]

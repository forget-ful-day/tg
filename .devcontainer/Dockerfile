FROM node:18-bullseye

# Установка необходимых пакетов
RUN apt-get update && apt-get install -y \
    git \
    curl \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Установка рабочей директории
WORKDIR /workspace

# Копирование файлов проекта
COPY . .

# Установка прав
RUN chmod -R 755 /workspace
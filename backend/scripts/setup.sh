#!/bin/bash

echo "🚀 Настройка Crypto Split Bill Backend..."

# Проверяем наличие Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не найден. Пожалуйста, установите Node.js"
    exit 1
fi

# Проверяем наличие PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL не найден. Пожалуйста, установите PostgreSQL"
    exit 1
fi

echo "✅ Node.js и PostgreSQL найдены"

# Устанавливаем зависимости
echo "📦 Устанавливаем зависимости..."
npm install

# Проверяем наличие .env файла
if [ ! -f .env ]; then
    echo "📝 Создаем .env файл из примера..."
    cp env.example .env
    echo "⚠️  Пожалуйста, отредактируйте .env файл с вашими настройками"
fi

# Генерируем Prisma клиент
echo "🔧 Генерируем Prisma клиент..."
npm run db:generate

echo "✅ Настройка завершена!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Отредактируйте .env файл с вашими настройками базы данных"
echo "2. Создайте базу данных PostgreSQL"
echo "3. Запустите миграции: npm run db:migrate"
echo "4. Запустите сервер: npm run dev"
echo ""
echo "📚 Документация: README.md"
echo "🧪 Примеры запросов: examples/api-examples.http"

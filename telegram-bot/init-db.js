const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

// Создаем папку data если её нет
if (!fs.existsSync('data')) {
    fs.mkdirSync('data');
}

// Подключаемся к базе данных
const db = new sqlite3.Database('./data/products.db', (err) => {
    if (err) {
        console.error('Ошибка подключения к базе данных:', err.message);
    } else {
        console.log('✅ Подключен к SQLite базе данных');
    }
});

// Создаем таблицу категорий
db.run(`CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Создаем таблицу товаров
db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    image_url TEXT,
    stock INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories (id)
)`);

// Добавляем тестовые категории
const categories = [
    ['📱 Электроника', 'Смартфоны, ноутбуки, гаджеты'],
    ['👕 Одежда', 'Мужская, женская, детская одежда'],
    ['🏠 Дом и сад', 'Мебель, товары для дома'],
    ['🎮 Игры и развлечения', 'Игры, консоли, развлечения'],
    ['📚 Книги', 'Художественная и учебная литература']
];

categories.forEach(category => {
    db.run('INSERT OR IGNORE INTO categories (name, description) VALUES (?, ?)', category);
});

// Добавляем тестовые товары
const products = [
    [1, 'iPhone 15 Pro', 'Новый iPhone с камерой 48 Мп', 999.99, 'https://example.com/iphone.jpg', 10],
    [1, 'Samsung Galaxy S24', 'Флагман Samsung с AI', 899.99, 'https://example.com/galaxy.jpg', 15],
    [1, 'MacBook Air M3', 'Ноутбук Apple на чипе M3', 1299.99, 'https://example.com/macbook.jpg', 5],
    [2, 'Джинсы Levi\'s', 'Классические джинсы 501', 89.99, 'https://example.com/jeans.jpg', 50],
    [2, 'Футболка Nike', 'Хлопковая футболка с логотипом', 29.99, 'https://example.com/tshirt.jpg', 100],
    [3, 'Диван угловой', 'Угловой диван с механизмом раскладывания', 599.99, 'https://example.com/sofa.jpg', 3],
    [3, 'Набор посуды', 'Керамический набор 12 предметов', 79.99, 'https://example.com/dishes.jpg', 20],
    [4, 'PlayStation 5', 'Игровая консоль нового поколения', 499.99, 'https://example.com/ps5.jpg', 8],
    [4, 'Nintendo Switch', 'Гибридная игровая консоль', 299.99, 'https://example.com/switch.jpg', 12],
    [5, 'Война и мир', 'Л.Н. Толстой, 4 тома', 24.99, 'https://example.com/warandpeace.jpg', 30],
    [5, 'JavaScript для начинающих', 'Учебник по программированию', 39.99, 'https://example.com/jsbook.jpg', 25]
];

products.forEach(product => {
    db.run('INSERT OR IGNORE INTO products (category_id, name, description, price, image_url, stock) VALUES (?, ?, ?, ?, ?, ?)', product);
});

// Закрываем соединение
db.close((err) => {
    if (err) {
        console.error('Ошибка при закрытии базы данных:', err.message);
    } else {
        console.log('✅ База данных инициализирована');
        console.log('📁 Файл базы данных: ./data/products.db');
        console.log('📊 Добавлено:');
        console.log('   - 5 категорий');
        console.log('   - 11 товаров');
    }
});

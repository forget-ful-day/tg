require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const sqlite3 = require('sqlite3').verbose();

// Получаем токен из переменных окружения
const token = process.env.BOT_TOKEN;

if (!token) {
    console.error('Ошибка: BOT_TOKEN не найден в .env файле');
    process.exit(1);
}

// Создаем экземпляр бота
const bot = new TelegramBot(token, { polling: true });

// Подключаем базу данных
const db = new sqlite3.Database('./data/products.db');

console.log('✅ Бот запущен!');
console.log('📁 База данных подключена');

// Обработка команды /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.first_name;
    
    const keyboard = {
        reply_markup: {
            keyboard: [
                ['📁 Каталог', '🛒 Корзина'],
                ['🔍 Поиск', '📞 Контакты'],
                ['ℹ️ Помощь']
            ],
            resize_keyboard: true
        }
    };
    
    bot.sendMessage(chatId, `Привет, ${username}! 👋\nДобро пожаловать в наш магазин!\nИспользуйте кнопки ниже:`, keyboard);
});

// Команда /catalog или кнопка "Каталог"
bot.onText(/\/catalog|📁 Каталог/, (msg) => {
    const chatId = msg.chat.id;
    showCategories(chatId);
});

// Показ категорий
function showCategories(chatId) {
    db.all('SELECT * FROM categories ORDER BY name', [], (err, categories) => {
        if (err) {
            bot.sendMessage(chatId, '❌ Ошибка при загрузке категорий');
            return;
        }
        
        if (categories.length === 0) {
            bot.sendMessage(chatId, '📭 Категории пока не добавлены');
            return;
        }
        
        const keyboard = {
            reply_markup: {
                inline_keyboard: categories.map(cat => [
                    {
                        text: cat.name,
                        callback_data: `category_${cat.id}`
                    }
                ])
            }
        };
        
        bot.sendMessage(chatId, '📂 Выберите категорию:', keyboard);
    });
}

// Обработка callback запросов (кнопки под сообщением)
bot.on('callback_query', (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;
    
    if (data.startsWith('category_')) {
        const categoryId = data.split('_')[1];
        showProducts(msg.chat.id, categoryId);
    }
    
    if (data.startsWith('product_')) {
        const productId = data.split('_')[1];
        showProductDetails(msg.chat.id, productId);
    }
    
    if (data.startsWith('back_to_category_')) {
        const categoryId = data.split('_')[3];
        showProducts(msg.chat.id, categoryId);
    }
    
    if (data.startsWith('add_to_cart_')) {
        const productId = data.split('_')[3];
        addToCart(msg.chat.id, productId);
    }
    
    bot.answerCallbackQuery(callbackQuery.id);
});

// Показ товаров в категории
function showProducts(chatId, categoryId) {
    db.get('SELECT name FROM categories WHERE id = ?', [categoryId], (err, category) => {
        if (err || !category) {
            bot.sendMessage(chatId, '❌ Категория не найдена');
            return;
        }
        
        db.all('SELECT * FROM products WHERE category_id = ? ORDER BY name', [categoryId], (err, products) => {
            if (err) {
                bot.sendMessage(chatId, '❌ Ошибка при загрузке товаров');
                return;
            }
            
            if (products.length === 0) {
                bot.sendMessage(chatId, `📭 В категории "${category.name}" пока нет товаров`);
                return;
            }
            
            // Показываем первые 5 товаров
            const productsToShow = products.slice(0, 5);
            
            const message = `📦 *${category.name}*\n\n${productsToShow.map((product, index) => {
                return `${index + 1}. ${product.name}\n   �� ${product.price} $\n   📦 ${product.stock} шт.\n`;
            }).join('\n')}`;
            
            const keyboard = {
                reply_markup: {
                    inline_keyboard: [
                        ...productsToShow.map(product => [
                            {
                                text: `🛒 ${product.name} - ${product.price}$`,
                                callback_data: `product_${product.id}`
                            }
                        ]),
                        [{ text: '◀️ Назад к категориям', callback_data: 'back_to_categories' }]
                    ]
                },
                parse_mode: 'Markdown'
            };
            
            bot.sendMessage(chatId, message, keyboard);
        });
    });
}

// Показ деталей товара
function showProductDetails(chatId, productId) {
    db.get(`
        SELECT p.*, c.name as category_name 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        WHERE p.id = ?
    `, [productId], (err, product) => {
        if (err || !product) {
            bot.sendMessage(chatId, '❌ Товар не найден');
            return;
        }
        
        const message = `
📦 *${product.name}*

📝 Описание: ${product.description || 'Нет описания'}
💰 Цена: ${product.price} $
📂 Категория: ${product.category_name}
📦 В наличии: ${product.stock} шт.
${product.stock > 0 ? '✅ В наличии' : '❌ Нет в наличии'}
        `.trim();
        
        const keyboard = {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: '🛒 Добавить в корзину',
                            callback_data: `add_to_cart_${product.id}`
                        }
                    ],
                    [
                        {
                            text: '◀️ Назад к товарам',
                            callback_data: `back_to_category_${product.category_id}`
                        }
                    ]
                ]
            },
            parse_mode: 'Markdown'
        };
        
        bot.sendMessage(chatId, message, keyboard);
    });
}

// Добавление в корзину (упрощенная версия)
function addToCart(chatId, productId) {
    db.get('SELECT * FROM products WHERE id = ?', [productId], (err, product) => {
        if (err || !product) {
            bot.sendMessage(chatId, '❌ Товар не найден');
            return;
        }
        
        if (product.stock <= 0) {
            bot.sendMessage(chatId, '❌ Товар закончился');
            return;
        }
        
        // В реальном приложении здесь была бы работа с таблицей корзины
        // Для упрощения просто показываем сообщение
        bot.sendMessage(chatId, 
            `✅ Товар "${product.name}" добавлен в корзину!\n\n` +
            `💰 Цена: ${product.price} $\n` +
            `Используйте команду /cart для просмотра корзины`
        );
    });
}

// Команда /cart - показать корзину
bot.onText(/\/cart|🛒 Корзина/, (msg) => {
    const chatId = msg.chat.id;
    
    // В реальном приложении здесь бы загружались товары из корзины
    bot.sendMessage(chatId, 
        `🛒 *Ваша корзина*\n\n` +
        `1. iPhone 15 Pro - 999.99 $ x 1\n` +
        `2. Чехол для iPhone - 29.99 $ x 2\n\n` +
        `📦 Всего товаров: 3\n` +
        `💰 Общая сумма: 1059.97 $\n\n` +
        `Для оформления заказа свяжитесь с нами: /contacts`,
        { parse_mode: 'Markdown' }
    );
});

// Команда /search - поиск товаров
bot.onText(/\/search|🔍 Поиск/, (msg) => {
    const chatId = msg.chat.id;
    
    bot.sendMessage(chatId, '🔍 Введите название товара для поиска:');
});

// Обработка поисковых запросов
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    // Если это не команда и не callback, проверяем не поиск ли это
    if (text && !text.startsWith('/') && 
        !['📁 Каталог', '🛒 Корзина', '�� Поиск', '📞 Контакты', 'ℹ️ Помощь'].includes(text)) {
        
        // Проверяем предыдущее сообщение
        bot.getChat(chatId).then(() => {
            // Упрощенный поиск
            db.all('SELECT * FROM products WHERE name LIKE ? LIMIT 5', [`%${text}%`], (err, products) => {
                if (err) {
                    bot.sendMessage(chatId, '❌ Ошибка при поиске');
                    return;
                }
                
                if (products.length === 0) {
                    bot.sendMessage(chatId, `🔍 По запросу "${text}" ничего не найдено`);
                    return;
                }
                
                const message = `🔍 *Результаты поиска по запросу "${text}"*\n\n` +
                    products.map((product, index) => {
                        return `${index + 1}. ${product.name}\n   💰 ${product.price} $\n   📦 ${product.stock} шт.`;
                    }).join('\n\n');
                
                bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
            });
        });
    }
});

// Команда /contacts
bot.onText(/\/contacts|📞 Контакты/, (msg) => {
    const chatId = msg.chat.id;
    
    bot.sendMessage(chatId, 
        `📞 *Наши контакты*\n\n` +
        `📧 Email: shop@example.com\n` +
        `📱 Телефон: +7 (999) 123-45-67\n` +
        `🕐 Часы работы: 9:00 - 21:00\n\n` +
        `📍 Адрес: г. Москва, ул. Примерная, д. 1\n\n` +
        `Для связи с менеджером: @shop_manager`,
        { parse_mode: 'Markdown' }
    );
});

// Команда /help
bot.onText(/\/help|ℹ️ Помощь/, (msg) => {
    const chatId = msg.chat.id;
    
    bot.sendMessage(chatId, 
        `ℹ️ *Помощь*\n\n` +
        `*Основные команды:*\n` +
        `/start - Главное меню\n` +
        `/catalog - Каталог товаров\n` +
        `/cart - Корзина\n` +
        `/search - Поиск товаров\n` +
        `/contacts - Контакты\n` +
        `/help - Эта справка\n\n` +
        `*Как сделать заказ:*\n` +
        `1. Выберите товар в каталоге\n` +
        `2. Добавьте в корзину\n` +
        `3. Свяжитесь с нами для оформления\n\n` +
        `💡 Просто введите название товара для поиска!`,
        { parse_mode: 'Markdown' }
    );
});

// Команда для админов - статистика
bot.onText(/\/stats/, (msg) => {
    const chatId = msg.chat.id;
    
    // Простая проверка на админа (в реальном приложении нужна настоящая проверка)
    if (msg.from.username !== 'ваш_username') {
        return;
    }
    
    db.all(`
        SELECT 
            (SELECT COUNT(*) FROM categories) as categories_count,
            (SELECT COUNT(*) FROM products) as products_count,
            (SELECT SUM(stock) FROM products) as total_stock,
            (SELECT SUM(price * stock) FROM products) as total_value
    `, [], (err, result) => {
        if (err) {
            bot.sendMessage(chatId, '❌ Ошибка получения статистики');
            return;
        }
        
        const stats = result[0];
        bot.sendMessage(chatId, 
            `📊 *Статистика магазина*\n\n` +
            `📂 Категорий: ${stats.categories_count}\n` +
            `📦 Товаров: ${stats.products_count}\n` +
            `📈 Товаров на складе: ${stats.total_stock || 0} шт.\n` +
            `💰 Общая стоимость: ${Math.round(stats.total_value || 0)} $\n\n` +
            `🔄 Бот работает: ${Math.round(process.uptime() / 60)} мин.`,
            { parse_mode: 'Markdown' }
        );
    });
});

// Обработка ошибок
bot.on('polling_error', (error) => {
    console.error('❌ Polling error:', error.message);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Остановка бота...');
    db.close();
    bot.stopPolling();
    console.log('✅ Бот остановлен');
    process.exit(0);
});

console.log('🔄 Бот ожидает сообщений...');

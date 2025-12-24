const TelegramBot = require('node-telegram-bot-api');
const SafeSender = require('../utils/safeSender');
const productController = require('../controllers/productController');
const categoryController = require('../controllers/categoryController');
require('dotenv').config();

class BotService {
    constructor() {
        this.bot = null;
        this.safeSender = SafeSender;
        this.commands = [
            { command: '/start', description: 'Запустить бота' },
            { command: '/help', description: 'Помощь по командам' },
            { command: '/products', description: 'Список товаров' },
            { command: '/categories', description: 'Список категорий' },
            { command: '/stats', description: 'Статистика магазина' },
            { command: '/search', description: 'Поиск товаров' }
        ];
    }

    /**
     * Инициализация бота
     */
    initialize() {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        
        if (!token) {
            console.error('❌ TELEGRAM_BOT_TOKEN не установлен в .env файле');
            process.exit(1);
        }

        this.bot = new TelegramBot(token, { polling: true });
        console.log('🤖 Бот инициализирован');
        
        this.setupCommands();
        this.setupHandlers();
        
        return this.bot;
    }

    /**
     * Установка команд бота
     */
    setupCommands() {
        this.bot.setMyCommands(this.commands)
            .then(() => console.log('✅ Команды бота установлены'))
            .catch(err => console.error('❌ Ошибка установки команд:', err));
    }

    /**
     * Настройка обработчиков
     */
    setupHandlers() {
        // Обработка команды /start
        this.bot.onText(/\/start/, async (msg) => {
            const chatId = msg.chat.id;
            const welcomeMessage = `👋 Привет, ${msg.from.first_name}!\n\n` +
                'Я бот-магазин. Вот что я умею:\n\n' +
                this.commands.map(cmd => `${cmd.command} - ${cmd.description}`).join('\n') +
                '\n\nИспользуйте команды для навигации.';
            
            await this.safeSender.sendMessage(this.bot, chatId, welcomeMessage, { parse_mode: 'HTML' });
        });

        // Обработка команды /help
        this.bot.onText(/\/help/, async (msg) => {
            const chatId = msg.chat.id;
            const helpMessage = '📚 *Доступные команды:*\n\n' +
                this.commands.map(cmd => `*${cmd.command}* - ${cmd.description}`).join('\n') +
                '\n\nДля поиска товаров используйте: /search [запрос]';
            
            await this.safeSender.sendMessage(this.bot, chatId, helpMessage, { parse_mode: 'HTML' });
        });

        // Обработка команды /products
        this.bot.onText(/\/products/, async (msg) => {
            const chatId = msg.chat.id;
            
            try {
                await this.safeSender.sendMessage(this.bot, chatId, '🔄 Загружаю товары...');
                
                const products = await productController.getAllProducts();
                await this.safeSender.sendProductsMessage(this.bot, chatId, products);
                
            } catch (error) {
                console.error('Ошибка в /products:', error);
                await this.safeSender.sendMessage(this.bot, chatId, '❌ Ошибка при загрузке товаров');
            }
        });

        // Обработка команды /categories
        this.bot.onText(/\/categories/, async (msg) => {
            const chatId = msg.chat.id;
            
            try {
                await this.safeSender.sendMessage(this.bot, chatId, '🔄 Загружаю категории...');
                
                const categories = await categoryController.getAllCategories();
                await this.safeSender.sendCategoriesMessage(this.bot, chatId, categories);
                
            } catch (error) {
                console.error('Ошибка в /categories:', error);
                await this.safeSender.sendMessage(this.bot, chatId, '❌ Ошибка при загрузке категорий');
            }
        });

        // Обработка команды /stats
        this.bot.onText(/\/stats/, async (msg) => {
            const chatId = msg.chat.id;
            
            try {
                await this.safeSender.sendMessage(this.bot, chatId, '📊 Считаю статистику...');
                
                const productStats = await productController.getProductsStats();
                const categoryStats = await categoryController.getCategoryStats();
                
                let statsMessage = '📈 *Статистика магазина*\n\n';
                statsMessage += `🛍️ *Товары всего:* ${productStats.total}\n`;
                statsMessage += `✅ *В наличии:* ${productStats.inStock}\n`;
                statsMessage += `❌ *Нет в наличии:* ${productStats.outOfStock}\n\n`;
                statsMessage += '📁 *Категории:*\n';
                
                categoryStats.forEach(stat => {
                    statsMessage += `• ${stat.name}: ${stat.productCount} товаров\n`;
                });
                
                await this.safeSender.sendMessage(this.bot, chatId, statsMessage, { parse_mode: 'HTML' });
                
            } catch (error) {
                console.error('Ошибка в /stats:', error);
                await this.safeSender.sendMessage(this.bot, chatId, '❌ Ошибка при получении статистики');
            }
        });

        // Обработка команды /search
        this.bot.onText(/\/search(.+)?/, async (msg, match) => {
            const chatId = msg.chat.id;
            const query = match[1] ? match[1].trim() : '';
            
            if (!query) {
                return this.safeSender.sendMessage(this.bot, chatId, 
                    '🔍 Введите поисковый запрос после команды:\n/search [запрос]');
            }
            
            try {
                await this.safeSender.sendMessage(this.bot, chatId, `🔎 Ищу "${query}"...`);
                
                const products = await productController.searchProducts(query);
                
                if (products.length === 0) {
                    return this.safeSender.sendMessage(this.bot, chatId, 
                        `😞 По запросу "${query}" ничего не найдено`);
                }
                
                await this.safeSender.sendProductsMessage(this.bot, chatId, products);
                
            } catch (error) {
                console.error('Ошибка в /search:', error);
                await this.safeSender.sendMessage(this.bot, chatId, '❌ Ошибка при поиске товаров');
            }
        });

        // Обработка текстовых сообщений (не команд)
        this.bot.on('message', async (msg) => {
            if (!msg.text || msg.text.startsWith('/')) return;
            
            const chatId = msg.chat.id;
            const response = `📝 Вы написали: "${msg.text}"\n\n` +
                'Используйте команды для взаимодействия с ботом. ' +
                'Напишите /help для списка команд.';
            
            await this.safeSender.sendMessage(this.bot, chatId, response);
        });

        // Обработка ошибок
        this.bot.on('polling_error', (error) => {
            console.error('❌ Ошибка polling:', error.message);
        });

        this.bot.on('webhook_error', (error) => {
            console.error('❌ Ошибка webhook:', error.message);
        });

        console.log('✅ Обработчики бота настроены');
    }

    /**
     * Получить экземпляр бота
     */
    getBot() {
        return this.bot;
    }
}

module.exports = new BotService();
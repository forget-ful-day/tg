require('dotenv').config();
const database = require('./config/database');
const botService = require('./services/botService');

class Application {
    constructor() {
        this.port = process.env.PORT || 3000;
    }

    async start() {
        try {
            console.log('🚀 Запуск Telegram бота...');
            
            // Подключаем базу данных
            await database.connect();
            
            // Инициализируем бота
            botService.initialize();
            
            console.log(`🤖 Бот успешно запущен!`);
            console.log('\n📋 Доступные команды:');
            botService.commands.forEach(cmd => {
                console.log(`   ${cmd.command} - ${cmd.description}`);
            });
            
            console.log('\n⚡ Бот готов принимать команды!');
            
            // Обработка завершения
            this.setupGracefulShutdown();
            
        } catch (error) {
            console.error('❌ Ошибка запуска приложения:', error);
            process.exit(1);
        }
    }

    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            console.log(`\n${signal} получен. Завершение работы...`);
            
            try {
                // Отключаем базу данных
                await database.disconnect();
                console.log('✅ База данных отключена');
                
                // Останавливаем бота
                if (botService.bot) {
                    botService.bot.stopPolling();
                    console.log('✅ Бот остановлен');
                }
                
                console.log('👋 Приложение завершено');
                process.exit(0);
                
            } catch (error) {
                console.error('❌ Ошибка при завершении:', error);
                process.exit(1);
            }
        };
        
        // Обработка сигналов завершения
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
        
        // Обработка необработанных ошибок
        process.on('uncaughtException', (error) => {
            console.error('🔥 Необработанная ошибка:', error);
        });
        
        process.on('unhandledRejection', (reason, promise) => {
            console.error('🔥 Необработанный rejection:', reason);
        });
    }
}

// Запуск приложения
const app = new Application();
app.start();
require('dotenv').config();
const expressApp = require('express'); // переименовали переменную
const database = require('./config/database');
const botService = require('./services/botService');

class Application {
    constructor() {
        this.app = expressApp(); // используем переименованную переменную
        this.port = process.env.PORT || 3000;
    }

    async start() {
        try {
            console.log('🚀 Запуск приложения...');
            
            // Подключаем базу данных
            await database.connect();
            
            // Инициализируем бота
            botService.initialize();
            
            // Настраиваем Express (для вебхуков если нужно)
            this.setupExpress();
            
            // Запускаем сервер
            this.app.listen(this.port, () => {
                console.log(`✅ Сервер запущен на порту ${this.port}`);
                console.log(`🤖 Бот готов к работе!`);
                console.log('\n📋 Доступные команды:');
                botService.commands.forEach(cmd => {
                    console.log(`   ${cmd.command} - ${cmd.description}`);
                });
            });
            
            // Обработка завершения
            this.setupGracefulShutdown();
            
        } catch (error) {
            console.error('❌ Ошибка запуска приложения:', error);
            process.exit(1);
        }
    }

    setupExpress() {
        // Middleware
        this.app.use(expressApp.json()); // используем expressApp
        this.app.use(expressApp.urlencoded({ extended: true }));
        
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'OK',
                timestamp: new Date().toISOString(),
                database: database.isConnected ? 'connected' : 'disconnected',
                bot: botService.bot ? 'running' : 'stopped'
            });
        });
        
        // Главная страница
        this.app.get('/', (req, res) => {
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Telegram Bot</title>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            max-width: 800px;
                            margin: 0 auto;
                            padding: 20px;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            min-height: 100vh;
                            color: white;
                        }
                        .container {
                            background: rgba(255, 255, 255, 0.1);
                            backdrop-filter: blur(10px);
                            border-radius: 20px;
                            padding: 40px;
                            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                        }
                        h1 {
                            text-align: center;
                            margin-bottom: 30px;
                            font-size: 2.5em;
                        }
                        .status {
                            display: flex;
                            justify-content: space-around;
                            margin: 30px 0;
                            flex-wrap: wrap;
                        }
                        .status-item {
                            background: rgba(255, 255, 255, 0.2);
                            padding: 20px;
                            border-radius: 10px;
                            text-align: center;
                            min-width: 150px;
                            margin: 10px;
                        }
                        .commands {
                            background: rgba(255, 255, 255, 0.2);
                            padding: 20px;
                            border-radius: 10px;
                            margin-top: 30px;
                        }
                        .command {
                            display: flex;
                            margin: 10px 0;
                            padding: 10px;
                            background: rgba(255, 255, 255, 0.1);
                            border-radius: 5px;
                        }
                        .command-cmd {
                            font-weight: bold;
                            width: 150px;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>🤖 Telegram Bot Dashboard</h1>
                        
                        <div class="status">
                            <div class="status-item">
                                <div>📊 Status</div>
                                <div style="font-size: 1.5em; font-weight: bold;">🟢 Running</div>
                            </div>
                            <div class="status-item">
                                <div>🗄️ Database</div>
                                <div style="font-size: 1.5em; font-weight: bold;">${database.isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
                            </div>
                            <div class="status-item">
                                <div>🌐 Port</div>
                                <div style="font-size: 1.5em; font-weight: bold;">${this.port}</div>
                            </div>
                        </div>
                        
                        <div class="commands">
                            <h3>📋 Available Commands:</h3>
                            ${botService.commands.map(cmd => `
                                <div class="command">
                                    <div class="command-cmd">${cmd.command}</div>
                                    <div>${cmd.description}</div>
                                </div>
                            `).join('')}
                        </div>
                        
                        <div style="text-align: center; margin-top: 40px; opacity: 0.8;">
                            <p>Bot is running and ready to process commands</p>
                            <p>Check <a href="/health" style="color: #fff; text-decoration: underline;">/health</a> for detailed status</p>
                        </div>
                    </div>
                </body>
                </html>
            `);
        });
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
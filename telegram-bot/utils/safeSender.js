/**
 * Утилиты для безопасной отправки сообщений в Telegram
 * Решает проблему: "can't parse entities"
 */

class SafeSender {
    /**
     * Экранирует HTML символы для Telegram
     */
    static escapeHtml(text) {
        if (typeof text !== 'string') return text;
        
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Экранирует символы для MarkdownV2
     */
    static escapeMarkdown(text) {
        if (typeof text !== 'string') return text;
        
        const specialChars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
        return text.split('').map(char => 
            specialChars.includes(char) ? `\\${char}` : char
        ).join('');
    }

    /**
     * Безопасная отправка сообщения
     * @param {Object} bot - Экземпляр бота
     * @param {number} chatId - ID чата
     * @param {string} text - Текст сообщения
     * @param {Object} options - Опции отправки
     * @returns {Promise} Результат отправки
     */
    static async sendMessage(bot, chatId, text, options = {}) {
        // Если текст не строка, преобразуем
        if (typeof text !== 'string') {
            text = String(text);
        }

        // Логируем отправку
        console.log(`[${new Date().toISOString()}] Отправка в ${chatId}:`, {
            length: text.length,
            preview: text.length > 100 ? text.substring(0, 100) + '...' : text
        });

        try {
            let finalText = text;
            let finalOptions = { ...options };

            // Обработка в зависимости от parse_mode
            if (options.parse_mode === 'HTML') {
                finalText = this.escapeHtml(text);
            } else if (options.parse_mode === 'MarkdownV2') {
                finalText = this.escapeMarkdown(text);
            }

            // Отправляем сообщение
            return await bot.sendMessage(chatId, finalText, finalOptions);
            
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Ошибка отправки:`, {
                chatId,
                error: error.message,
                textLength: text.length
            });

            // Пробуем отправить без форматирования
            try {
                console.log('Пробуем отправить без форматирования...');
                return await bot.sendMessage(chatId, text, { ...options, parse_mode: null });
                
            } catch (secondError) {
                console.error('Вторая ошибка:', secondError.message);
                
                // Если текст слишком длинный, обрезаем
                let safeText = text;
                if (text.length > 4000) {
                    safeText = text.substring(0, 4000) + '... [сообщение обрезано]';
                }
                
                // Пробуем отправить простой текст
                try {
                    return await bot.sendMessage(chatId, safeText, { parse_mode: null });
                } catch (finalError) {
                    console.error('Финальная ошибка отправки:', finalError.message);
                    throw new Error(`Не удалось отправить сообщение: ${finalError.message}`);
                }
            }
        }
    }

    /**
     * Отправка сообщения с товарами
     */
    static async sendProductsMessage(bot, chatId, products) {
        if (!products || products.length === 0) {
            return this.sendMessage(bot, chatId, '📭 Товаров пока нет в наличии');
        }

        let message = '🛍️ *Список товаров:*\n\n';
        
        products.forEach((product, index) => {
            const name = this.escapeHtml(product.name || 'Без названия');
            const price = product.price || 0;
            const category = this.escapeHtml(product.category?.name || 'Без категории');
            
            message += `*${index + 1}. ${name}*\n`;
            message += `   💰 Цена: *${price} руб.*\n`;
            message += `   📁 Категория: ${category}\n`;
            
            if (product.description) {
                const desc = this.escapeHtml(product.description.substring(0, 100));
                message += `   📝 ${desc}${product.description.length > 100 ? '...' : ''}\n`;
            }
            
            message += '\n';
        });

        return this.sendMessage(bot, chatId, message, { parse_mode: 'HTML' });
    }

    /**
     * Отправка сообщения с категориями
     */
    static async sendCategoriesMessage(bot, chatId, categories) {
        if (!categories || categories.length === 0) {
            return this.sendMessage(bot, chatId, '📂 Категорий пока нет');
        }

        let message = '📁 *Список категорий:*\n\n';
        
        categories.forEach((category, index) => {
            const name = this.escapeHtml(category.name || 'Без названия');
            const count = category.products?.length || 0;
            
            message += `*${index + 1}. ${name}*\n`;
            message += `   📦 Товаров: ${count}\n`;
            
            if (category.description) {
                const desc = this.escapeHtml(category.description.substring(0, 80));
                message += `   📝 ${desc}${category.description.length > 80 ? '...' : ''}\n`;
            }
            
            message += '\n';
        });

        return this.sendMessage(bot, chatId, message, { parse_mode: 'HTML' });
    }
}

module.exports = SafeSender;
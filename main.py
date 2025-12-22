import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, MessageHandler, filters, ContextTypes
from typing import Dict, List
import json
import os

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Токен вашего бота
TOKEN = "7929828337:AAGBqSfWflzxjP14dMONJZfvIUsyIt8ztYo"

# Структура данных для каталога
catalog_data = {
    "categories": {
        "electronics": {
            "name": "📱 Электроника",
            "items": {
                "smartphone": {
                    "name": "Смартфон X",
                    "description": "Новейший смартфон с камерой 108Мп",
                    "price": 29999,
                    "image_url": "https://example.com/smartphone.jpg"
                },
                "laptop": {
                    "name": "Ноутбук Pro",
                    "description": "Мощный ноутбук для работы и игр",
                    "price": 89999,
                    "image_url": "https://github.com/forget-ful-day/tg/blob/772c22a2100b03222daff0acd02a59ef508f29fe/photo_5856361528313973698_y.jpg"
                }
            }
        },
        "clothing": {
            "name": "👕 Одежда",
            "items": {
                "tshirt": {
                    "name": "Футболка Premium",
                    "description": "Хлопковая футболка премиум-класса",
                    "price": 1999,
                    "image_url": "https://example.com/tshirt.jpg"
                },
                "jacket": {
                    "name": "Куртка зимняя",
                    "description": "Теплая зимняя куртка",
                    "price": 5999,
                    "image_url": "https://example.com/jacket.jpg"
                }
            }
        },
        "services": {
            "name": "🔧 Услуги",
            "items": {
                "design": {
                    "name": "Дизайн сайта",
                    "description": "Создание современного дизайна для сайта",
                    "price": 15000,
                    "image_url": "https://example.com/design.jpg"
                },
                "programming": {
                    "name": "Разработка бота",
                    "description": "Создание Telegram-бота под ключ",
                    "price": 25000,
                    "image_url": "https://example.com/bot.jpg"
                }
            }
        }
    }
}


# Сохранение данных в файл
def save_catalog():
    with open('catalog.json', 'w', encoding='utf-8') as f:
        json.dump(catalog_data, f, ensure_ascii=False, indent=2)


# Загрузка данных из файла
def load_catalog():
    global catalog_data
    try:
        with open('catalog.json', 'r', encoding='utf-8') as f:
            catalog_data = json.load(f)
    except FileNotFoundError:
        save_catalog()


# Команда /start
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    welcome_text = f"""
👋 Привет, {user.first_name}!

Добро пожаловать в каталог товаров и услуг!
Используйте кнопки ниже для навигации:
    """

    keyboard = [
        [InlineKeyboardButton("📂 Категории", callback_data="categories")],
        [InlineKeyboardButton("🛒 Корзина", callback_data="cart")],
        [InlineKeyboardButton("❓ Помощь", callback_data="help")]
    ]

    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(welcome_text, reply_markup=reply_markup)


# Показать категории
async def show_categories(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    keyboard = []
    for cat_id, cat_info in catalog_data["categories"].items():
        keyboard.append([InlineKeyboardButton(cat_info["name"], callback_data=f"category_{cat_id}")])

    keyboard.append([InlineKeyboardButton("⬅️ Назад", callback_data="back_to_main")])

    reply_markup = InlineKeyboardMarkup(keyboard)

    await query.edit_message_text(
        text="📂 Выберите категорию:",
        reply_markup=reply_markup
    )


# Показать товары в категории
async def show_category_items(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    cat_id = query.data.replace("category_", "")
    category = catalog_data["categories"][cat_id]

    keyboard = []
    for item_id, item_info in category["items"].items():
        button_text = f"{item_info['name']} - {item_info['price']} руб."
        keyboard.append([InlineKeyboardButton(button_text, callback_data=f"item_{cat_id}_{item_id}")])

    keyboard.append([InlineKeyboardButton("⬅️ Назад к категориям", callback_data="categories")])

    reply_markup = InlineKeyboardMarkup(keyboard)

    await query.edit_message_text(
        text=f"📦 {category['name']}\nВыберите товар:",
        reply_markup=reply_markup
    )


# Показать информацию о товаре
async def show_item(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    data_parts = query.data.replace("item_", "").split("_")
    cat_id = data_parts[0]
    item_id = data_parts[1]

    item = catalog_data["categories"][cat_id]["items"][item_id]

    text = f"""
🏷️ <b>{item['name']}</b>

📝 Описание: {item['description']}
💰 Цена: <b>{item['price']} руб.</b>

{'-' * 20}
    """

    keyboard = [
        [
            InlineKeyboardButton("🛒 Добавить в корзину", callback_data=f"add_{cat_id}_{item_id}"),
            InlineKeyboardButton("📞 Заказать", callback_data=f"order_{cat_id}_{item_id}")
        ],
        [InlineKeyboardButton("⬅️ Назад", callback_data=f"category_{cat_id}")]
    ]

    reply_markup = InlineKeyboardMarkup(keyboard)

    # Если есть ссылка на изображение, отправляем его
    if item.get('image_url'):
        await context.bot.send_photo(
            chat_id=query.message.chat_id,
            photo=item['image_url'],
            caption=text,
            parse_mode='HTML',
            reply_markup=reply_markup
        )
        await query.message.delete()
    else:
        await query.edit_message_text(
            text=text,
            parse_mode='HTML',
            reply_markup=reply_markup
        )


# Корзина пользователя
user_carts = {}


async def show_cart(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    user_id = query.from_user.id

    if user_id not in user_carts or not user_carts[user_id]:
        text = "🛒 Ваша корзина пуста!"
        keyboard = [[InlineKeyboardButton("⬅️ Назад", callback_data="back_to_main")]]
    else:
        total = 0
        text = "🛒 <b>Ваша корзина:</b>\n\n"

        for i, (item_id, qty) in enumerate(user_carts[user_id].items(), 1):
            # Находим товар в каталоге
            item_info = None
            for cat_id, category in catalog_data["categories"].items():
                if item_id in category["items"]:
                    item_info = category["items"][item_id]
                    break

            if item_info:
                item_total = item_info['price'] * qty
                total += item_total
                text += f"{i}. {item_info['name']}\n   Кол-во: {qty} × {item_info['price']} руб. = {item_total} руб.\n\n"

        text += f"\n💰 <b>Итого: {total} руб.</b>"

        keyboard = [
            [InlineKeyboardButton("✅ Оформить заказ", callback_data="checkout")],
            [InlineKeyboardButton("🗑️ Очистить корзину", callback_data="clear_cart")],
            [InlineKeyboardButton("⬅️ Назад", callback_data="back_to_main")]
        ]

    reply_markup = InlineKeyboardMarkup(keyboard)

    await query.edit_message_text(
        text=text,
        parse_mode='HTML',
        reply_markup=reply_markup
    )


# Добавить в корзину
async def add_to_cart(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer("Товар добавлен в корзину! ✅")

    data_parts = query.data.replace("add_", "").split("_")
    cat_id = data_parts[0]
    item_id = f"{cat_id}_{data_parts[1]}"

    user_id = query.from_user.id

    if user_id not in user_carts:
        user_carts[user_id] = {}

    if item_id not in user_carts[user_id]:
        user_carts[user_id][item_id] = 0

    user_carts[user_id][item_id] += 1


# Очистка корзины
async def clear_cart(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    user_id = query.from_user.id
    user_carts[user_id] = {}

    await show_cart(update, context)


# Оформление заказа
async def checkout(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    user_id = query.from_user.id

    if user_id not in user_carts or not user_carts[user_id]:
        text = "Ваша корзина пуста!"
    else:
        total = 0
        order_details = []

        for item_id, qty in user_carts[user_id].items():
            cat_id, item_key = item_id.split("_")
            item_info = catalog_data["categories"][cat_id]["items"][item_key]
            item_total = item_info['price'] * qty
            total += item_total
            order_details.append(f"- {item_info['name']} × {qty} = {item_total} руб.")

        order_text = "\n".join(order_details)

        text = f"""
✅ <b>Заказ оформлен!</b>

Детали заказа:
{order_text}

<b>Общая сумма: {total} руб.</b>

Для подтверждения заказа свяжитесь с нами:
📞 Телефон: +7 (XXX) XXX-XX-XX
✉️ Email: info@example.com

Спасибо за заказ! 🎉
        """

        # Очищаем корзину после оформления
        user_carts[user_id] = {}

    keyboard = [[InlineKeyboardButton("⬅️ На главную", callback_data="back_to_main")]]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await query.edit_message_text(
        text=text,
        parse_mode='HTML',
        reply_markup=reply_markup
    )


# Помощь
async def show_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    text = """
❓ <b>Помощь по использованию бота:</b>

📂 <b>Категории</b> - просмотр всех доступных категорий товаров/услуг
🛒 <b>Корзина</b> - просмотр и оформление заказа
🔍 <b>Поиск</b> - введите название товара для поиска

<b>Команды:</b>
/start - Главное меню
/categories - Показать категории
/cart - Показать корзину
/help - Эта справка

По вопросам и предложениям:
📞 +7 (XXX) XXX-XX-XX
✉️ support@example.com
    """

    keyboard = [[InlineKeyboardButton("⬅️ Назад", callback_data="back_to_main")]]
    reply_markup = InlineKeyboardMarkup(keyboard)

    await query.edit_message_text(
        text=text,
        parse_mode='HTML',
        reply_markup=reply_markup
    )


# Возврат в главное меню
async def back_to_main(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    user = update.effective_user

    keyboard = [
        [InlineKeyboardButton("📂 Категории", callback_data="categories")],
        [InlineKeyboardButton("🛒 Корзина", callback_data="cart")],
        [InlineKeyboardButton("❓ Помощь", callback_data="help")]
    ]

    reply_markup = InlineKeyboardMarkup(keyboard)

    await query.edit_message_text(
        text=f"Главное меню\nПривет, {user.first_name}!",
        reply_markup=reply_markup
    )


# Обработка текстовых сообщений для поиска
async def handle_search(update: Update, context: ContextTypes.DEFAULT_TYPE):
    search_term = update.message.text.lower()
    results = []

    for cat_id, category in catalog_data["categories"].items():
        for item_id, item in category["items"].items():
            if search_term in item['name'].lower() or search_term in item['description'].lower():
                results.append((cat_id, item_id, item))

    if not results:
        await update.message.reply_text("❌ По вашему запросу ничего не найдено.")
        return

    text = f"🔍 Найдено товаров: {len(results)}\n\n"

    keyboard = []
    for cat_id, item_id, item in results[:10]:  # Ограничиваем 10 результатами
        text += f"🏷️ {item['name']}\n"
        text += f"📝 {item['description'][:100]}...\n"
        text += f"💰 {item['price']} руб.\n"
        text += "-" * 20 + "\n"

        keyboard.append([InlineKeyboardButton(
            f"📦 {item['name']} - {item['price']} руб.",
            callback_data=f"item_{cat_id}_{item_id}"
        )])

    keyboard.append([InlineKeyboardButton("⬅️ На главную", callback_data="back_to_main")])

    reply_markup = InlineKeyboardMarkup(keyboard)

    await update.message.reply_text(text, reply_markup=reply_markup)


# Команда для администратора (добавление товаров)
async def admin_add_item(update: Update, context: ContextTypes.DEFAULT_TYPE):
    # Здесь можно добавить функционал для администратора
    # Например, добавление новых товаров через команды
    await update.message.reply_text("Админ-панель. Функционал в разработке.")


# Основная функция
def main():
    # Загружаем данные каталога
    load_catalog()

    # Создаем приложение
    application = Application.builder().token(TOKEN).build()

    # Обработчики команд
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", lambda u, c: show_help(u, c)))
    application.add_handler(CommandHandler("categories", lambda u, c: show_categories(u, c)))
    application.add_handler(CommandHandler("cart", lambda u, c: show_cart(u, c)))

    # Обработчики callback-запросов
    application.add_handler(CallbackQueryHandler(show_categories, pattern="^categories$"))
    application.add_handler(CallbackQueryHandler(show_category_items, pattern="^category_"))
    application.add_handler(CallbackQueryHandler(show_item, pattern="^item_"))
    application.add_handler(CallbackQueryHandler(show_cart, pattern="^cart$"))
    application.add_handler(CallbackQueryHandler(add_to_cart, pattern="^add_"))
    application.add_handler(CallbackQueryHandler(clear_cart, pattern="^clear_cart$"))
    application.add_handler(CallbackQueryHandler(checkout, pattern="^checkout$"))
    application.add_handler(CallbackQueryHandler(show_help, pattern="^help$"))
    application.add_handler(CallbackQueryHandler(back_to_main, pattern="^back_to_main$"))

    # Обработчик текстовых сообщений (для поиска)
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_search))

    # Запуск бота
    print("Бот запущен...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == '__main__':
    main()

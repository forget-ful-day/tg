const mongoose = require('mongoose');
require('dotenv').config();

class Database {
    constructor() {
        this.isConnected = false;
    }

    async connect() {
        try {
            const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/telegram_bot';
            
            await mongoose.connect(MONGODB_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000
            });
            
            this.isConnected = true;
            console.log('✅ Подключено к MongoDB');
            
            // Создаем тестовые данные если их нет
            await this.createTestData();
            
        } catch (error) {
            console.error('❌ Ошибка подключения к MongoDB:', error.message);
            process.exit(1);
        }
    }

    async createTestData() {
        try {
            const Category = require('../models/Category');
            const Product = require('../models/Product');
            
            // Проверяем есть ли категории
            const categoriesCount = await Category.countDocuments();
            if (categoriesCount === 0) {
                console.log('Создаем тестовые категории...');
                
                const categories = [
                    { name: 'Электроника', description: 'Гаджеты и устройства' },
                    { name: 'Одежда', description: 'Модная одежда и аксессуары' },
                    { name: 'Книги', description: 'Литература разных жанров' },
                    { name: 'Продукты', description: 'Пищевые продукты' }
                ];
                
                const createdCategories = await Category.insertMany(categories);
                console.log(`✅ Создано ${createdCategories.length} категорий`);
                
                // Создаем тестовые товары
                const products = [
                    { name: 'iPhone 15 Pro', description: 'Смартфон Apple', price: 99990, category: createdCategories[0]._id },
                    { name: 'Ноутбук Dell XPS', description: 'Мощный ноутбук для работы', price: 129990, category: createdCategories[0]._id },
                    { name: 'Футболка хлопковая', description: 'Комфортная футболка', price: 1990, category: createdCategories[1]._id },
                    { name: 'Джинсы классические', description: 'Синие джинсы', price: 4990, category: createdCategories[1]._id },
                    { name: 'Война и мир', description: 'Роман Л.Н. Толстого', price: 890, category: createdCategories[2]._id },
                    { name: 'Молоко 3.2%', description: 'Свежее молоко', price: 95, category: createdCategories[3]._id }
                ];
                
                await Product.insertMany(products);
                console.log(`✅ Создано ${products.length} тестовых товаров`);
            }
            
        } catch (error) {
            console.error('Ошибка создания тестовых данных:', error);
        }
    }

    async disconnect() {
        if (this.isConnected) {
            await mongoose.disconnect();
            this.isConnected = false;
            console.log('Отключено от MongoDB');
        }
    }
}

module.exports = new Database();
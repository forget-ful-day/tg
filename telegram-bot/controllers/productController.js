const Product = require('../models/Product');

class ProductController {
    /**
     * Получить все товары
     */
    async getAllProducts() {
        try {
            return await Product.find({ isActive: true })
                .populate('category', 'name')
                .sort({ createdAt: -1 });
        } catch (error) {
            console.error('Ошибка получения товаров:', error);
            throw error;
        }
    }

    /**
     * Получить товары по категории
     */
    async getProductsByCategory(categoryId) {
        try {
            return await Product.find({ 
                category: categoryId,
                isActive: true 
            })
            .populate('category', 'name')
            .sort({ price: 1 });
        } catch (error) {
            console.error('Ошибка получения товаров по категории:', error);
            throw error;
        }
    }

    /**
     * Получить товар по ID
     */
    async getProductById(productId) {
        try {
            return await Product.findById(productId)
                .populate('category', 'name description');
        } catch (error) {
            console.error('Ошибка получения товара:', error);
            throw error;
        }
    }

    /**
     * Поиск товаров
     */
    async searchProducts(query) {
        try {
            return await Product.find({
                $or: [
                    { name: { $regex: query, $options: 'i' } },
                    { description: { $regex: query, $options: 'i' } },
                    { sku: { $regex: query, $options: 'i' } }
                ],
                isActive: true
            })
            .populate('category', 'name')
            .limit(20);
        } catch (error) {
            console.error('Ошибка поиска товаров:', error);
            throw error;
        }
    }

    /**
     * Получить статистику товаров
     */
    async getProductsStats() {
        try {
            const total = await Product.countDocuments({ isActive: true });
            const inStock = await Product.countDocuments({ 
                isActive: true, 
                inStock: true,
                quantity: { $gt: 0 }
            });
            const categories = await Product.aggregate([
                { $match: { isActive: true } },
                { $group: { _id: '$category', count: { $sum: 1 } } }
            ]);

            return {
                total,
                inStock,
                outOfStock: total - inStock,
                byCategories: categories
            };
        } catch (error) {
            console.error('Ошибка получения статистики:', error);
            throw error;
        }
    }
}

module.exports = new ProductController();
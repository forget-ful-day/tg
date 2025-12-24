const Category = require('../models/Category');

class CategoryController {
    /**
     * Получить все категории
     */
    async getAllCategories() {
        try {
            return await Category.find({ isActive: true })
                .populate({
                    path: 'products',
                    match: { isActive: true, inStock: true },
                    select: 'name price'
                })
                .sort({ order: 1, name: 1 });
        } catch (error) {
            console.error('Ошибка получения категорий:', error);
            throw error;
        }
    }

    /**
     * Получить категорию по ID
     */
    async getCategoryById(categoryId) {
        try {
            return await Category.findById(categoryId)
                .populate({
                    path: 'products',
                    match: { isActive: true },
                    options: { sort: { price: 1 } }
                });
        } catch (error) {
            console.error('Ошибка получения категории:', error);
            throw error;
        }
    }

    /**
     * Создать категорию
     */
    async createCategory(data) {
        try {
            const category = new Category(data);
            return await category.save();
        } catch (error) {
            console.error('Ошибка создания категории:', error);
            throw error;
        }
    }

    /**
     * Обновить категорию
     */
    async updateCategory(categoryId, data) {
        try {
            return await Category.findByIdAndUpdate(
                categoryId,
                { ...data, updatedAt: Date.now() },
                { new: true, runValidators: true }
            );
        } catch (error) {
            console.error('Ошибка обновления категории:', error);
            throw error;
        }
    }

    /**
     * Удалить категорию
     */
    async deleteCategory(categoryId) {
        try {
            return await Category.findByIdAndUpdate(
                categoryId,
                { isActive: false, updatedAt: Date.now() },
                { new: true }
            );
        } catch (error) {
            console.error('Ошибка удаления категории:', error);
            throw error;
        }
    }

    /**
     * Получить статистику категорий
     */
    async getCategoryStats() {
        try {
            return await Category.aggregate([
                { $match: { isActive: true } },
                {
                    $lookup: {
                        from: 'products',
                        localField: '_id',
                        foreignField: 'category',
                        as: 'products'
                    }
                },
                {
                    $project: {
                        name: 1,
                        productCount: { $size: '$products' },
                        activeProducts: {
                            $size: {
                                $filter: {
                                    input: '$products',
                                    as: 'product',
                                    cond: { $eq: ['$$product.isActive', true] }
                                }
                            }
                        }
                    }
                },
                { $sort: { productCount: -1 } }
            ]);
        } catch (error) {
            console.error('Ошибка получения статистики категорий:', error);
            throw error;
        }
    }
}

module.exports = new CategoryController();
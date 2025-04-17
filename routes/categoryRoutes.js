const express = require('express');
const mongoose = require('mongoose');
const Category = require('../models/Category');
const authenticateToken = require('../middleware/authMiddleware');

module.exports = (io) => {
  const router = express.Router();

  // إحصائيات الفئات
  router.get('/stats', authenticateToken, async (req, res) => {
    try {
      const totalCategories = await Category.countDocuments();
      const categories = await Category.find();
      const totalProducts = categories.reduce((sum, cat) => sum + cat.products.length, 0);
      const productsByCategory = categories.map(cat => ({ name: cat.name.ar, count: cat.products.length }));
      res.json({ totalCategories, totalProducts, productsByCategory });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'خطأ في الخادم' });
    }
  });

  // جلب جميع الفئات
  router.get('/', authenticateToken, async (req, res) => {
    try {
      const categories = await Category.find();
      res.json(categories);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'خطأ في الخادم' });
    }
  });

  // إضافة منتج جديد لفئة معينة
  router.post('/:categoryId/products', authenticateToken, async (req, res) => {
    try {
      const { categoryId } = req.params;
      const productData = req.body;
      const category = await Category.findById(categoryId);
      if (!category) return res.status(404).json({ message: 'الفئة غير موجودة' });
      
      // إنشاء معرّف جديد للمنتج
      const newProduct = { id: new mongoose.Types.ObjectId().toString(), ...productData };
      category.products.push(newProduct);
      await category.save();
      
      // إرسال إشعار عبر Socket.IO
      io.emit('update', { action: 'add', categoryId, product: newProduct });
      res.json(category);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'خطأ في الخادم' });
    }
  });

  // تعديل منتج موجود
  router.put('/:categoryId/products/:productId', authenticateToken, async (req, res) => {
    try {
      const { categoryId, productId } = req.params;
      const updateData = req.body;
      const category = await Category.findById(categoryId);
      if (!category) return res.status(404).json({ message: 'الفئة غير موجودة' });
      
      const productIndex = category.products.findIndex(p => p.id === productId);
      if (productIndex === -1) return res.status(404).json({ message: 'المنتج غير موجود' });
      
      // التأكد من وجود معرّف للمنتج
      if (!category.products[productIndex].id) {
        category.products[productIndex].id = new mongoose.Types.ObjectId().toString();
      }
      category.products[productIndex] = { ...category.products[productIndex], ...updateData };
      await category.save();
      
      io.emit('update', { action: 'update', categoryId, productId, product: updateData });
      res.json(category);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'خطأ في الخادم' });
    }
  });

  // حذف منتج
  router.delete('/:categoryId/products/:productId', authenticateToken, async (req, res) => {
    try {
      const { categoryId, productId } = req.params;
      const category = await Category.findById(categoryId);
      if (!category) return res.status(404).json({ message: 'الفئة غير موجودة' });
      
      category.products = category.products.filter(p => p.id !== productId);
      await category.save();
      
      io.emit('update', { action: 'delete', categoryId, productId });
      res.json({ message: 'تم حذف المنتج بنجاح' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'خطأ في الخادم' });
    }
  });

  return router;
};

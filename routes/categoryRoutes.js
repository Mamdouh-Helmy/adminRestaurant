const express = require('express');
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

module.exports = (io) => {
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
  router.get('/', async (req, res) => {
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

      // التحقق من المكونات (بدون خصم المخزون)
      if (productData.ingredients && Array.isArray(productData.ingredients)) {
        for (const ingredient of productData.ingredients) {
          const { supplierId, weightIndex, quantity } = ingredient;

          // جلب المورد
          const supplier = await Supplier.findById(supplierId);
          if (!supplier) {
            return res.status(400).json({ message: `المورد بالمعرّف ${supplierId} غير موجود` });
          }

          // التحقق من الوزن
          const weight = supplier.weights[weightIndex];
          if (!weight) {
            return res.status(400).json({ message: `الوزن المحدد غير متاح في المورد` });
          }

          // حساب الوزن المطلوب بناءً على عدد الحبات
          const weightPerUnit = weight.weightPerUnit || 0; // وزن الحبة الواحدة (كيلو)
          if (weightPerUnit <= 0) {
            return res.status(400).json({ message: `وزن الحبة الواحدة لـ ${supplier.nameAr} غير محدد أو غير صالح` });
          }
          const totalWeightRequired = quantity * weightPerUnit; // الوزن الكلي = عدد الحبات × وزن الحبة

          // التحقق من المخزون (بس من غير خصم)
          if (weight.stock < totalWeightRequired) {
            return res.status(400).json({
              message: `المخزون غير كافٍ لـ ${weight.quantity} ${weight.unit} من ${supplier.nameAr} (المطلوب: ${totalWeightRequired} ${weight.unit}, المتوفر: ${weight.stock})`,
            });
          }
        }
      }

      // إنشاء معرّف جديد للمنتج
      const newProduct = {
        id: new mongoose.Types.ObjectId().toString(),
        ...productData,
      };
      category.products.push(newProduct);
      await category.save();

      // إرسال إشعار عبر Socket.IO
      io.emit('update', { action: 'add', categoryId, product: newProduct });

      res.json(category);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'خطأ في الخادم', details: error.message });
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

      // التحقق من المكونات الجديدة (بدون خصم المخزون)
      if (updateData.ingredients && Array.isArray(updateData.ingredients)) {
        for (const ingredient of updateData.ingredients) {
          const { supplierId, weightIndex, quantity } = ingredient;
          const supplier = await Supplier.findById(supplierId);
          if (!supplier) {
            return res.status(400).json({ message: `المورد بالمعرّف ${supplierId} غير موجود` });
          }
          const weight = supplier.weights[weightIndex];
          if (!weight) {
            return res.status(400).json({ message: `الوزن المحدد غير متاح في المورد` });
          }

          // حساب الوزن المطلوب بناءً على عدد الحبات
          const weightPerUnit = weight.weightPerUnit || 0;
          if (weightPerUnit <= 0) {
            return res.status(400).json({ message: `وزن الحبة الواحدة لـ ${supplier.nameAr} غير محدد أو غير صالح` });
          }
          const totalWeightRequired = quantity * weightPerUnit;

          if (weight.stock < totalWeightRequired) {
            return res.status(400).json({
              message: `المخزون غير كافٍ لـ ${weight.quantity} ${weight.unit} من ${supplier.nameAr} (المطلوب: ${totalWeightRequired} ${weight.unit}, المتوفر: ${weight.stock})`,
            });
          }
        }
      }

      // تحديث المنتج
      category.products[productIndex] = {
        ...category.products[productIndex],
        ...updateData,
        id: category.products[productIndex].id,
      };

      await category.save();

      io.emit('update', { action: 'update', categoryId, productId, product: updateData });

      res.json(category);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'خطأ في الخادم', details: error.message });
    }
  });

  // حذف منتج
  router.delete('/:categoryId/products/:productId', authenticateToken, async (req, res) => {
    try {
      const { categoryId, productId } = req.params;
      const category = await Category.findById(categoryId);
      if (!category) return res.status(404).json({ message: 'الفئة غير موجودة' });

      const productIndex = category.products.findIndex(p => p.id === productId);
      if (productIndex === -1) return res.status(404).json({ message: 'المنتج غير موجود' });

      category.products.splice(productIndex, 1);
      await category.save();

      io.emit('update', { action: 'delete', categoryId, productId });

      res.json({ message: 'تم حذف المنتج بنجاح' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'خطأ في الخادم', details: error.message });
    }
  });

  return router;
};
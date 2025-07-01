const express = require('express');
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const authenticateToken = require('../middleware/authMiddleware');

// تعريف الـ router
const router = express.Router();

module.exports = (io) => {
  // بيع منتج
  router.post('/sell/:categoryId/products/:productId', authenticateToken, async (req, res) => {
    try {
      const { categoryId, productId } = req.params;
      const { quantitySold } = req.body;

      // التحقق من الكمية المباعة
      if (!quantitySold || quantitySold <= 0) {
        return res.status(400).json({ message: 'الكمية المباعة يجب أن تكون أكبر من صفر' });
      }

      // جلب الفئة والمنتج
      const category = await Category.findById(categoryId);
      if (!category) return res.status(404).json({ message: 'الفئة غير موجودة' });

      const product = category.products.find(p => p.id === productId);
      if (!product) return res.status(404).json({ message: 'المنتج غير موجود' });

      // التحقق من وجود مكونات
      if (!product.ingredients || product.ingredients.length === 0) {
        return res.status(400).json({ message: 'المنتج لا يحتوي على مكونات للبيع' });
      }

      // تفاصيل المكونات مع الأرباح
      const ingredientDetails = [];

      // التحقق من المخزون وخصمه
      for (const ingredient of product.ingredients) {
        const { supplierId, weightIndex, quantity } = ingredient;

        // جلب المورد
        const supplier = await Supplier.findById(supplierId);
        if (!supplier) {
          return res.status(400).json({ message: `المورد بالمعرف ${supplierId} غير موجود` });
        }

        const weight = supplier.weights[weightIndex];
        if (!weight) {
          return res.status(400).json({ message: `الوزن المحدد (index: ${weightIndex}) غير متاح في المورد ${supplier.nameAr}` });
        }

        // حساب الوزن المطلوب بناءً على عدد الحبات
        const weightPerUnit = weight.weightPerUnit || 0;
        if (weightPerUnit <= 0) {
          return res.status(400).json({ message: `وزن الحبة الواحدة لـ ${supplier.nameAr} غير محدد أو غير صالح` });
        }
        const totalUnitsUsed = quantity * quantitySold; // عدد الحبات المستخدمة = عدد الحبات لكل وحدة × الكمية المباعة
        const totalWeightToDeduct = totalUnitsUsed * weightPerUnit; // الوزن الكلي = عدد الحبات × وزن الحبة

        // التحقق من كفاية المخزون
        if (weight.stock < totalWeightToDeduct) {
          return res.status(400).json({
            message: `المخزون غير كافٍ لـ ${weight.quantity} ${weight.unit} من ${supplier.nameAr} (المطلوب: ${totalWeightToDeduct} ${weight.unit}, المتوفر: ${weight.stock})`,
          });
        }

        // خصم الوزن من المخزون
        weight.stock -= totalWeightToDeduct;
        weight.totalPrice = weight.price * weight.stock; // تحديث السعر الكلي بعد الخصم
        await supplier.save();

        // حساب تكلفة المكون (سعر الشراء)
        const ingredientCost = totalWeightToDeduct * weight.price;

        // إضافة تفاصيل المكون
        ingredientDetails.push({
          supplierName: supplier.nameAr,
          unit: weight.unit,
          quantityUsed: totalUnitsUsed, // عدد الحبات المستخدمة
          weightUsed: totalWeightToDeduct, // الوزن المستخدم (كيلو)
          purchasePrice: ingredientCost, // سعر الشراء للمكون
        });
      }

      // حساب السعر الكلي للمنتج
      const originalPrice = product.price * quantitySold; // السعر الأصلي
      let discountedPrice = originalPrice;

      // حساب السعر بعد الخصم إذا كان فيه خصم
      if (product.discount && product.discountPercentage > 0) {
        const discountAmount = (product.discountPercentage / 100) * originalPrice;
        discountedPrice = originalPrice - discountAmount;
      }

      // توزيع سعر البيع على المكونات بناءً على نسبة تكلفتها
      const totalIngredientCost = ingredientDetails.reduce((sum, ing) => sum + ing.purchasePrice, 0);
      for (const ingredient of ingredientDetails) {
        const ingredientSaleShare = totalIngredientCost > 0
          ? (ingredient.purchasePrice / totalIngredientCost) * discountedPrice
          : 0;
        ingredient.salePrice = ingredientSaleShare; // سعر البيع للمكون
        ingredient.profit = ingredientSaleShare - ingredient.purchasePrice; // الربح
      }

      // حفظ التغييرات
      await category.save();

      // إرسال إشعار عبر Socket.IO
      io.emit('update', { action: 'sell', categoryId, productId });
      io.emit('supplier-update', { action: 'update-stock', supplierId: product.ingredients.map(i => i.supplierId) });

      // إرجاع تفاصيل البيع
      res.json({
        message: 'تمت عملية البيع وتحديث المخزون بنجاح',
        originalPrice: originalPrice.toFixed(2), // السعر الأصلي للمنتج
        discountedPrice: discountedPrice.toFixed(2), // السعر بعد الخصم
        ingredientDetails, // تفاصيل المكونات (عدد الحبات، الوزن المستخدم، سعر الشراء، سعر البيع، الربح)
      });
    } catch (error) {
      console.error('Error in sell route:', error);
      res.status(500).json({ message: 'خطأ في الخادم', details: error.message });
    }
  });

  return router;
};
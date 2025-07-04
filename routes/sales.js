const express = require('express');
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

module.exports = (io) => {
  // بيع منتج
  router.post('/sell/:categoryId/products/:productId', async (req, res) => {
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
      let totalIngredientCost = 0;

      // التحقق من المخزون وحساب التكاليف
      for (const ingredient of product.ingredients) {
        const { supplierId, quantity } = ingredient;

        // جلب المورد
        const supplier = await Supplier.findById(supplierId);
        if (!supplier) {
          return res.status(400).json({ message: `المورد بالمعرف ${supplierId} غير موجود` });
        }

        // حساب عدد الحبات المطلوبة
        const totalPiecesNeeded = quantity * quantitySold; // عدد الحبات المطلوبة = حبات لكل منتج × الكمية المباعة

        // التحقق من كفاية المخزون
        if (supplier.stock < totalPiecesNeeded) {
          return res.status(400).json({
            message: `المخزون غير كافٍ لـ ${supplier.nameAr} (المطلوب: ${totalPiecesNeeded} حبة، المتوفر: ${supplier.stock} حبة)`,
          });
        }

        // حساب الوزن والتكلفة
        const totalWeight = totalPiecesNeeded * supplier.weightPerPiece;
        const ingredientCost = totalPiecesNeeded * supplier.pricePerPiece;
        totalIngredientCost += ingredientCost;

        // إضافة تفاصيل المكون
        ingredientDetails.push({
          supplierName: supplier.nameAr,
          piecesUsed: totalPiecesNeeded,
          weightUsed: totalWeight.toFixed(3),
          weightUnit: supplier.weightUnit,
          pricePerPiece: supplier.pricePerPiece,
          totalCost: ingredientCost.toFixed(2),
          remainingStock: supplier.stock - totalPiecesNeeded,
        });
      }

      // خصم الحبات من المخزون
      for (let i = 0; i < product.ingredients.length; i++) {
        const ingredient = product.ingredients[i];
        const detail = ingredientDetails[i];
        
        const supplier = await Supplier.findById(ingredient.supplierId);
        supplier.stock -= detail.piecesUsed;
        await supplier.save();

        // إرسال إشعار تحديث المخزون
        io.emit('supplier-update', { action: 'update-stock', supplier });
      }

      // حساب أسعار البيع والأرباح
      const originalPrice = product.price * quantitySold;
      let discountedPrice = originalPrice;

      // تطبيق الخصم إذا كان موجوداً
      if (product.discount && product.discountPercentage > 0) {
        const discountAmount = (product.discountPercentage / 100) * originalPrice;
        discountedPrice = originalPrice - discountAmount;
      }

      // حساب الربح الإجمالي
      const totalProfit = discountedPrice - totalIngredientCost;

      // توزيع سعر البيع والربح على المكونات حسب نسبة التكلفة
      for (const ingredient of ingredientDetails) {
        const costRatio = totalIngredientCost > 0 ? ingredient.totalCost / totalIngredientCost : 0;
        ingredient.saleShare = (costRatio * discountedPrice).toFixed(2);
        ingredient.profit = (ingredient.saleShare - ingredient.totalCost).toFixed(2);
      }

      // حفظ التغييرات
      await category.save();

      // إرسال إشعار عام
      io.emit('update', { action: 'sell', categoryId, productId });

      // إرجاع تفاصيل البيع
      res.json({
        message: 'تمت عملية البيع وتحديث المخزون بنجاح',
        saleDetails: {
          productName: product.name.ar,
          quantitySold,
          originalPrice: originalPrice.toFixed(2),
          discountedPrice: discountedPrice.toFixed(2),
          totalIngredientCost: totalIngredientCost.toFixed(2),
          totalProfit: totalProfit.toFixed(2),
          discountApplied: product.discount ? `${product.discountPercentage}%` : 'لا يوجد',
        },
        ingredientDetails,
      });
    } catch (error) {
      console.error('Error in sell route:', error);
      res.status(500).json({ message: 'خطأ في الخادم', details: error.message });
    }
  });

  return router;
};
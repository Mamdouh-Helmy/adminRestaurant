const express = require('express');
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const Order = require('../models/Order');

const router = express.Router();

module.exports = (io) => {
  // Fetch all orders
  router.get('/orders', async (req, res) => {
    try {
      const orders = await Order.find().sort({ createdAt: -1 });
      res.json(orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ message: 'خطأ في الخادم', details: error.message });
    }
  });

  // Update order status
  router.put('/orders/:orderId/status', async (req, res) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body;
      
      const order = await Order.findByIdAndUpdate(
        orderId, 
        { status, updatedAt: Date.now() }, 
        { new: true }
      );
      
      if (!order) {
        return res.status(404).json({ message: 'الطلب غير موجود' });
      }

      io.emit('order-status-updated', { orderId, status, order });
      res.json(order);
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ message: 'خطأ في الخادم', details: error.message });
    }
  });

  // Sell product and save order
  router.post('/sell/:categoryId/products/:productId', async (req, res) => {
    try {
      const { categoryId, productId } = req.params;
      const { 
        quantitySold, 
        userData, 
        orderMethod, 
        selectedDetail, 
        selectedTime1, 
        selectedOption, 
        selectedDate, 
        selectedHour, 
        paymentMethod,
        additions = []
      } = req.body;

      if (!quantitySold || quantitySold <= 0) {
        return res.status(400).json({ message: 'الكمية المباعة يجب أن تكون أكبر من صفر' });
      }

      const category = await Category.findById(categoryId);
      if (!category) return res.status(404).json({ message: 'الفئة غير موجودة' });

      const product = category.products.find(p => p.id === productId);
      if (!product) return res.status(404).json({ message: 'المنتج غير موجود' });

      if (!product.ingredients || product.ingredients.length === 0) {
        return res.status(400).json({ message: 'المنتج لا يحتوي على مكونات للبيع' });
      }

      const ingredientDetails = [];
      let totalIngredientCost = 0;

      // معالجة المكونات
      for (const ingredient of product.ingredients) {
        const { supplierId, quantity } = ingredient;
        const supplier = await Supplier.findById(supplierId);
        if (!supplier) {
          return res.status(400).json({ message: `المورد بالمعرف ${supplierId} غير موجود` });
        }

        const totalPiecesNeeded = quantity * quantitySold;
        if (supplier.stock < totalPiecesNeeded) {
          return res.status(400).json({
            message: `المخزون غير كافٍ لـ ${supplier.nameAr} (المطلوب: ${totalPiecesNeeded} حبة، المتوفر: ${supplier.stock} حبة)`,
          });
        }

        const totalWeight = totalPiecesNeeded * supplier.weightPerPiece;
        const ingredientCost = totalPiecesNeeded * supplier.pricePerPiece;
        totalIngredientCost += ingredientCost;

        ingredientDetails.push({
          supplierId: supplier._id,
          supplierName: supplier.nameAr,
          quantity: quantity,
          piecesUsed: totalPiecesNeeded,
          weightUsed: parseFloat(totalWeight.toFixed(3)),
          weightUnit: supplier.weightUnit,
          totalCost: parseFloat(ingredientCost.toFixed(2)),
        });
      }

      // خصم المخزون
      for (const ingredient of product.ingredients) {
        const supplier = await Supplier.findById(ingredient.supplierId);
        supplier.stock -= ingredient.quantity * quantitySold;
        await supplier.save();
        io.emit('supplier-update', { action: 'update-stock', supplier });
      }

      // حساب الأسعار
      const originalPrice = product.price * quantitySold;
      let discountedPrice = originalPrice;
      if (product.discount && product.discountPercentage > 0) {
        const discountAmount = (product.discountPercentage / 100) * originalPrice;
        discountedPrice = originalPrice - discountAmount;
      }

      // حساب سعر الإضافات
      const additionsTotal = additions.reduce((sum, addition) => sum + (addition.price || 0), 0);
      const finalItemPrice = discountedPrice + additionsTotal;

      const totalProfit = discountedPrice - totalIngredientCost;

      // حفظ الطلب
      const order = new Order({
        user: {
          username: userData.displayName || 'Unknown',
          name: userData.displayName || 'Unknown',
          email: userData.email,
          phone: userData.phoneNumber || '',
          profileImage: userData.photoURL || 'https://img.freepik.com/free-psd/3d-illustration-human-avatar-profile_23-2150671142.jpg',
        },
        items: [{
          productId: product.id,
          name: product.name,
          description: product.description,
          quantity: quantitySold,
          price: product.price,
          finalPrice: finalItemPrice,
          product_image: product.product_image,
          discount: product.discount,
          discountPercentage: product.discountPercentage,
          ingredients: ingredientDetails,
          additions: additions,
        }],
        orderMethod: orderMethod || 'delivery',
        deliveryDetails: {
          location: selectedDetail || { ar: '', en: '' },
          date: selectedDate || { ar: '', en: '' },
          hour: selectedHour || { ar: '', en: '' },
          option: selectedOption || 'asap',
        },
        paymentMethod: paymentMethod || 'cash',
        subtotal: finalItemPrice,
        deliveryFee: orderMethod === 'delivery' ? 1.0 : 0,
        total: finalItemPrice + (orderMethod === 'delivery' ? 1.0 : 0),
        status: 'pending',
      });

      await order.save();
      await category.save();
      
      io.emit('update', { action: 'sell', categoryId, productId });
      io.emit('order-added', { order });

      res.json({
        message: 'تمت عملية البيع وتسجيل الطلب بنجاح',
        saleDetails: {
          productName: product.name.ar,
          quantitySold,
          originalPrice: originalPrice.toFixed(2),
          discountedPrice: discountedPrice.toFixed(2),
          totalIngredientCost: totalIngredientCost.toFixed(2),
          totalProfit: totalProfit.toFixed(2),
          discountApplied: product.discount ? `${product.discountPercentage}%` : 'لا يوجد',
          additionsTotal: additionsTotal.toFixed(2),
          finalPrice: finalItemPrice.toFixed(2),
        },
        ingredientDetails,
        orderId: order._id,
      });
    } catch (error) {
      console.error('Error in sell route:', error);
      res.status(500).json({ message: 'خطأ في الخادم', details: error.message });
    }
  });

  return router;
};
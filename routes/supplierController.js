const express = require('express');
const mongoose = require('mongoose');
const Supplier = require('../models/Supplier');
const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

module.exports = (io) => {
  // إنشاء مورد جديد
  router.post('/', authenticateToken, async (req, res) => {
    try {
      const { 
        nameAr, 
        nameEn, 
        weightUnit, 
        totalWeight, 
        pieceCount, 
        pricePerKilo,
        weightPerPiece,
        totalPrice,
        pricePerPiece,
        stock,
        typeOfFood, 
        description 
      } = req.body;

      // التحقق من الحقول المطلوبة
      if (!nameAr || !nameEn || !weightUnit || !totalWeight || !pieceCount || !pricePerKilo) {
        return res.status(400).json({ 
          error: 'جميع الحقول الأساسية مطلوبة (الأسماء، وحدة الوزن، الوزن الإجمالي، عدد الحبات، سعر الكيلو)' 
        });
      }

      // التأكد من أن القيم الرقمية صحيحة
      if (totalWeight <= 0 || pieceCount <= 0 || pricePerKilo <= 0) {
        return res.status(400).json({ 
          error: 'الوزن الإجمالي وعدد الحبات وسعر الكيلو يجب أن تكون أكبر من صفر' 
        });
      }

      const newSupplier = new Supplier({
        nameAr,
        nameEn,
        weightUnit,
        totalWeight,
        pieceCount,
        pricePerKilo,
        weightPerPiece,
        totalPrice,
        pricePerPiece,
        stock,
        typeOfFood: typeOfFood || { ar: '', en: '' },
        description: description || { ar: '', en: '' },
      });

      await newSupplier.save();
      
      // إرسال إشعار للعملاء المتصلين
      io.emit('supplier-update', { action: 'create', supplier: newSupplier });
      
      res.status(201).json(newSupplier);
    } catch (err) {
      console.error('Error creating supplier:', err);
      res.status(500).json({ error: 'فشل إنشاء المورد', details: err.message });
    }
  });

  // جلب جميع الموردين
  router.get('/', authenticateToken, async (req, res) => {
    try {
      const suppliers = await Supplier.find().sort({ createdAt: -1 });
      res.json(suppliers);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      res.status(500).json({ error: 'فشل جلب الموردين', details: err.message });
    }
  });

  // جلب مورد بواسطة المعرف
  router.get('/:id', authenticateToken, async (req, res) => {
    try {
      const supplier = await Supplier.findById(req.params.id);
      if (!supplier) {
        return res.status(404).json({ error: 'المورد غير موجود' });
      }
      res.json(supplier);
    } catch (err) {
      console.error('Error fetching supplier:', err);
      res.status(500).json({ error: 'فشل جلب المورد', details: err.message });
    }
  });

  // تعديل مورد
  router.put('/:id', authenticateToken, async (req, res) => {
    try {
      const { 
        nameAr, 
        nameEn, 
        weightUnit, 
        totalWeight, 
        pieceCount, 
        pricePerKilo,
        weightPerPiece,
        totalPrice,
        pricePerPiece,
        stock,
        typeOfFood, 
        description 
      } = req.body;

      const updatedSupplier = await Supplier.findByIdAndUpdate(
        req.params.id,
        {
          nameAr,
          nameEn,
          weightUnit,
          totalWeight,
          pieceCount,
          pricePerKilo,
          weightPerPiece,
          totalPrice,
          pricePerPiece,
          stock,
          typeOfFood,
          description,
          updatedAt: Date.now(),
        },
        { new: true }
      );

      if (!updatedSupplier) {
        return res.status(404).json({ error: 'المورد غير موجود' });
      }

      // إرسال إشعار للعملاء المتصلين
      io.emit('supplier-update', { action: 'update', supplier: updatedSupplier });
      
      res.json(updatedSupplier);
    } catch (err) {
      console.error('Error updating supplier:', err);
      res.status(500).json({ error: 'فشل تعديل المورد', details: err.message });
    }
  });

  // حذف مورد
  router.delete('/:id', authenticateToken, async (req, res) => {
    try {
      const supplier = await Supplier.findByIdAndDelete(req.params.id);
      if (!supplier) {
        return res.status(404).json({ error: 'المورد غير موجود' });
      }

      // إرسال إشعار للعملاء المتصلين
      io.emit('supplier-update', { action: 'delete', id: req.params.id });
      
      res.status(204).send();
    } catch (err) {
      console.error('Error deleting supplier:', err);
      res.status(500).json({ error: 'فشل حذف المورد', details: err.message });
    }
  });

  // تحديث المخزون (خصم حبات من المخزون)
  router.put('/:id/stock', authenticateToken, async (req, res) => {
    try {
      const { piecesToDeduct } = req.body;

      if (!piecesToDeduct || piecesToDeduct <= 0) {
        return res.status(400).json({ error: 'عدد الحبات المراد خصمها يجب أن يكون أكبر من صفر' });
      }

      const supplier = await Supplier.findById(req.params.id);
      if (!supplier) {
        return res.status(404).json({ error: 'المورد غير موجود' });
      }

      // التحقق من كفاية المخزون
      if (supplier.stock < piecesToDeduct) {
        return res.status(400).json({ 
          error: `المخزون غير كافٍ. المتوفر: ${supplier.stock} حبة، المطلوب: ${piecesToDeduct} حبة` 
        });
      }

      // خصم الحبات من المخزون
      supplier.stock -= piecesToDeduct;
      await supplier.save();

      // إرسال إشعار للعملاء المتصلين
      io.emit('supplier-update', { action: 'update-stock', supplier });
      
      res.json({
        message: 'تم تحديث المخزون بنجاح',
        supplier: supplier,
        deductedPieces: piecesToDeduct,
        remainingStock: supplier.stock,
      });
    } catch (err) {
      console.error('Error updating stock:', err);
      res.status(500).json({ error: 'فشل تحديث المخزون', details: err.message });
    }
  });

  // إضافة مخزون (إضافة حبات للمخزون)
  router.put('/:id/add-stock', authenticateToken, async (req, res) => {
    try {
      const { piecesToAdd } = req.body;

      if (!piecesToAdd || piecesToAdd <= 0) {
        return res.status(400).json({ error: 'عدد الحبات المراد إضافتها يجب أن يكون أكبر من صفر' });
      }

      const supplier = await Supplier.findById(req.params.id);
      if (!supplier) {
        return res.status(404).json({ error: 'المورد غير موجود' });
      }

      // إضافة الحبات للمخزون
      supplier.stock += piecesToAdd;
      await supplier.save();

      // إرسال إشعار للعملاء المتصلين
      io.emit('supplier-update', { action: 'add-stock', supplier });
      
      res.json({
        message: 'تم إضافة المخزون بنجاح',
        supplier: supplier,
        addedPieces: piecesToAdd,
        newStock: supplier.stock,
      });
    } catch (err) {
      console.error('Error adding stock:', err);
      res.status(500).json({ error: 'فشل إضافة المخزون', details: err.message });
    }
  });

  return router;
};
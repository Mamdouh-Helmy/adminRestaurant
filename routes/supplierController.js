const express = require('express');
const mongoose = require('mongoose');
const Supplier = require('../models/Supplier');
const authenticateToken = require('../middleware/authMiddleware');

module.exports = (io) => {
  const router = express.Router();

  // إنشاء مورد جديد
  router.post('/', authenticateToken, async (req, res) => {
    try {
      const { nameAr, nameEn, weights, prices, typeOfFood, description } = req.body;
      if (!nameAr || !nameEn || !weights || !prices || !typeOfFood || !description) {
        return res.status(400).json({ error: 'جميع الحقول مطلوبة باستثناء typeOfFood و description' });
      }

      const newSupplier = new Supplier({
        nameAr,
        nameEn,
        weights,
        prices,
        typeOfFood: typeOfFood || { ar: '', en: '' },
        description: description || { ar: '', en: '' },
      });

      await newSupplier.save();
      io.emit('supplier-update', { action: 'create', supplier: newSupplier });
      res.status(201).json(newSupplier);
    } catch (err) {
      res.status(500).json({ error: 'فشل إنشاء المورد', details: err.message });
    }
  });

  // جلب جميع الموردين
  router.get('/', authenticateToken, async (req, res) => {
    try {
      const suppliers = await Supplier.find();
      res.json(suppliers);
    } catch (err) {
      res.status(500).json({ error: 'فشل جلب الموردين', details: err.message });
    }
  });

  // جلب مورد بواسطة المعرف
  router.get('/:id', authenticateToken, async (req, res) => {
    try {
      const supplier = await Supplier.findById(req.params.id);
      if (!supplier) return res.status(404).json({ error: 'المورد غير موجود' });
      res.json(supplier);
    } catch (err) {
      res.status(500).json({ error: 'فشل جلب المورد', details: err.message });
    }
  });

  // تعديل مورد
  router.put('/:id', authenticateToken, async (req, res) => {
    try {
      const { nameAr, nameEn, weights, prices, typeOfFood, description } = req.body;
      const updatedSupplier = await Supplier.findByIdAndUpdate(
        req.params.id,
        { nameAr, nameEn, weights, prices, typeOfFood, description },
        { new: true }
      );
      if (!updatedSupplier) return res.status(404).json({ error: 'المورد غير موجود' });
      io.emit('supplier-update', { action: 'update', supplier: updatedSupplier });
      res.json(updatedSupplier);
    } catch (err) {
      res.status(500).json({ error: 'فشل تعديل المورد', details: err.message });
    }
  });

  // حذف مورد
  router.delete('/:id', authenticateToken, async (req, res) => {
    try {
      const supplier = await Supplier.findByIdAndDelete(req.params.id);
      if (!supplier) return res.status(404).json({ error: 'المورد غير موجود' });
      io.emit('supplier-update', { action: 'delete', id: req.params.id });
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: 'فشل حذف المورد', details: err.message });
    }
  });

  return router;
};

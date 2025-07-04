const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  nameAr: { type: String, required: true },
  nameEn: { type: String, required: true },
  weightUnit: {
    type: String,
    enum: ['كيلو', 'جرام', 'طن', 'باوند', 'أوقية'],
    default: 'كيلو',
    required: true,
  },
  totalWeight: { type: Number, required: true }, // الوزن الإجمالي
  pieceCount: { type: Number, required: true }, // عدد الحبات
  pricePerKilo: { type: Number, required: true }, // سعر الكيلو
  weightPerPiece: { type: Number, required: true }, // وزن الحبة الواحدة (محسوب)
  totalPrice: { type: Number, required: true }, // السعر الإجمالي (محسوب)
  pricePerPiece: { type: Number, required: true }, // سعر الحبة الواحدة (محسوب)
  stock: { type: Number, required: true }, // المخزون (عدد الحبات المتبقية)
  typeOfFood: {
    ar: { type: String, default: '' },
    en: { type: String, default: '' },
  },
  description: {
    ar: { type: String, default: '' },
    en: { type: String, default: '' },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update the updatedAt field before saving
supplierSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Supplier', supplierSchema);
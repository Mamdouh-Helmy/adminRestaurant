const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  nameAr: { type: String, required: true },
  nameEn: { type: String, required: true },
  weightUnit: {
    type: String,
    enum: ['كيلو', 'جرام', 'طن', 'باوند', 'أوقية', 'كارتونة'],
    default: 'كيلو',
    required: true,
  },
  totalWeight: { type: Number, required: true }, // الوزن الإجمالي أو وزن الكارتونة
  pieceCount: { type: Number, required: true }, // عدد الحبات الإجمالي
  weightPerPiece: { type: Number, required: true }, // وزن الحبة الواحدة
  stock: { type: Number, required: true }, // المخزون
  pricePerKilo: { type: Number, default: 0 }, // سعر الكيلو (اختياري)
  totalPrice: { type: Number, default: 0 }, // السعر الإجمالي (اختياري)
  pricePerPiece: { type: Number, default: 0 }, // سعر الحبة (اختياري)
  cartonWeight: { type: Number }, // وزن الكارتونة (مطلوب فقط إذا كان weightUnit هو كارتونة)
  unitCount: { type: Number }, // عدد الوحدات (مطلوب فقط إذا كان weightUnit هو كارتونة)
  piecesPerUnit: { type: Number }, // عدد الحبات في الوحدة (مطلوب فقط إذا كان weightUnit هو كارتونة)
  description: {
    ar: { type: String, default: '' },
    en: { type: String, default: '' },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// التحقق من القيم المطلوبة بناءً على weightUnit
supplierSchema.pre('validate', function(next) {
  if (this.weightUnit === 'كارتونة') {
    if (!this.cartonWeight || !this.unitCount || !this.piecesPerUnit) {
      return next(new Error('وزن الكارتونة وعدد الوحدات وعدد الحبات في الوحدة مطلوبة عند استخدام كارتونة'));
    }
    if (this.cartonWeight <= 0 || this.unitCount <= 0 || this.piecesPerUnit <= 0) {
      return next(new Error('كل القيم (وزن الكارتونة، عدد الوحدات، عدد الحبات) يجب أن تكون أكبر من صفر'));
    }
    this.pieceCount = this.unitCount * this.piecesPerUnit; // حساب pieceCount تلقائيًا
    this.totalWeight = this.cartonWeight; // تعيين totalWeight كوزن الكارتونة
  } else if (this.pieceCount <= 0 || this.totalWeight <= 0) {
    return next(new Error('الوزن الإجمالي وعدد الحبات يجب أن تكون أكبر من صفر للوحدات الأخرى'));
  }
  this.weightPerPiece = this.totalWeight / this.pieceCount; // حساب weightPerPiece
  next();
});

// Update the updatedAt field before saving
supplierSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Supplier', supplierSchema);
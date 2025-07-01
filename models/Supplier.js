const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  nameAr: String,
  nameEn: String,
  weights: [
    {
      unit: {
        type: String,
        enum: ['كيلو', 'جرام', 'طن', 'باوند', 'أوقية', 'kilo', 'gram', 'ton', 'pound', 'ounce'],
        required: true,
      },
      quantity: { type: Number, required: true }, // عدد الحبات (تم تعديل المعنى)
      price: { type: Number, required: true },    // سعر الوحدة (كيلو)
      stock: { type: Number, required: true },    // المخزون بالوزن (كيلو)
      weightPerUnit: { type: Number, required: true }, // وزن الحبة الواحدة (كيلو)
      totalPrice: { type: Number, required: true }, // السعر الكلي = stock × price
    },
  ],
  prices: [{ type: Number, required: true }],
  typeOfFood: {
    ar: String,
    en: String,
  },
  description: {
    ar: String,
    en: String,
  },
});

module.exports = mongoose.model('Supplier', supplierSchema);
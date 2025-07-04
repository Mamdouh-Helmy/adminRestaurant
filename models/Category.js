const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  id: { type: String, unique: true },
  name: {
    ar: { type: String, required: true },
    en: { type: String, required: true },
  },
  category_image: String,
  products: [
    {
      id: { type: String, required: true },
      name: {
        ar: { type: String, required: true },
        en: { type: String, required: true },
      },
      description: {
        ar: { type: String, required: true },
        en: { type: String, required: true },
      },
      price: { type: Number, required: true },
      product_image: String,
      discount: { type: Boolean, default: false },
      discountPercentage: { type: Number, default: 0 },
      ingredients: [
        {
          supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
          quantity: { type: Number, required: true }, // عدد الحبات المطلوبة من هذا المورد لكل منتج
        },
      ],
    },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update the updatedAt field before saving
CategorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Category', CategorySchema);
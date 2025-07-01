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
      discountPercentage: { type: Number, default: 0 }, // نسبة الخصم (مثلاً 20 يعني 20%)
      ingredients: [
        {
          supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
          weightIndex: { type: Number, required: true },
          quantity: { type: Number, required: true },
        },
      ],
    },
  ],
});

module.exports = mongoose.model('Category', CategorySchema);
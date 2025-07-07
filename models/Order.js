const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    username: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: '' },
    profileImage: { type: String, default: 'https://img.freepik.com/free-psd/3d-illustration-human-avatar-profile_23-2150671142.jpg' },
  },
  items: [
    {
      productId: { type: String, required: true },
      name: {
        ar: { type: String, required: true },
        en: { type: String, required: true },
      },
      description: {
        ar: { type: String, required: true },
        en: { type: String, required: true },
      },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
      product_image: { type: String },
      discount: { type: Boolean, default: false },
      discountPercentage: { type: Number, default: 0 },
      finalPrice: { type: Number, required: true }, // السعر النهائي بعد الخصم
      ingredients: [
        {
          supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
          quantity: { type: Number, required: true },
          supplierName: { type: String, required: true },
          piecesUsed: { type: Number, required: true },
          weightUsed: { type: Number, required: true },
          weightUnit: { type: String, required: true },
          totalCost: { type: Number, required: true },
        },
      ],
      additions: [
        {
          name: { type: String },
          price: { type: Number },
        },
      ],
    },
  ],
  orderMethod: { type: String, enum: ['delivery', 'pickup'], required: true },
  deliveryDetails: {
    location: {
      ar: { type: String },
      en: { type: String },
    },
    date: {
      ar: { type: String },
      en: { type: String },
    },
    hour: {
      ar: { type: String },
      en: { type: String },
    },
    option: { type: String, enum: ['asap', 'later'], default: 'asap' },
  },
  paymentMethod: { type: String, enum: ['card', 'cash'], required: true },
  subtotal: { type: Number, required: true },
  deliveryFee: { type: Number, default: 1.0 },
  total: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'], 
    default: 'pending' 
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

orderSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Order', orderSchema);
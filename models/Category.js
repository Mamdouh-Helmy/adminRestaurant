const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
  id: { type: String, unique: true }, 
  name: {
    ar: { type: String, required: true }, 
    en: { type: String, required: true } 
  },
  category_image: String, 
  products: [
    {
      id: { type: String, required: true }, 
      name: {
        ar: { type: String, required: true }, 
        en: { type: String, required: true }  
      },
      description: {
        ar: { type: String, required: true },
        en: { type: String, required: true }  
      },
      price: { type: Number, required: true },
      product_image: String, 
      discount: Boolean,
    }
  ]
});

module.exports = mongoose.model('Category', CategorySchema);
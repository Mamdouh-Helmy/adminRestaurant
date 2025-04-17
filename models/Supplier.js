const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
    nameAr: { type: String }, // Arabic name
    nameEn: { type: String }, // English name
    weights: [
        {
            unit: {
                type: String,
                enum: [
                    // Arabic units
                    'كيلو', 'جرام', 'طن', 'باوند', 'أوقية',
                    // English units
                    'kilo', 'gram', 'ton', 'pound', 'ounce'
                ],
                required: true,
            },
            value: { type: Number, required: true }, // Weight value
        },
    ],
    prices: [{ type: Number, required: true }], // Prices corresponding to weights
    typeOfFood: {
        ar: { type: String }, // Arabic type of food (optional)
        en: { type: String }, // English type of food (optional)
    },
    description: {
        ar: { type: String }, // Arabic description (optional)
        en: { type: String }, // English description (optional)
    },
});

const Supplier = mongoose.model('Supplier', supplierSchema);

module.exports = Supplier;
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('تم الاتصال بقاعدة البيانات بنجاح');
  } catch (error) {
    console.error('حدث خطأ أثناء الاتصال بقاعدة البيانات:', error);
    process.exit(1); // إنهاء العملية إذا فشل الاتصال
  }
};

module.exports = connectDB;

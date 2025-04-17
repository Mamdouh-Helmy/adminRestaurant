require('dotenv').config();  
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ تم الاتصال بقاعدة البيانات بنجاح'))
  .catch(err => console.error('❌ حدث خطأ أثناء الاتصال بقاعدة البيانات:', err));

const createAdminUser = async () => {
  try {

    // التحقق مما إذا كان المستخدم موجودًا بالفعل
    const existingUser = await User.findOne({ username: process.env.NAMEADMIN });
    if (existingUser) {
      return;
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(process.env.PASSWORD, 10);

    // إنشاء المستخدم
    const adminUser = new User({
      username: process.env.NAMEADMIN,
      password: hashedPassword,
    });

    await adminUser.save();
    console.log('✅ تم إنشاء مستخدم المدير بنجاح:', adminUser);
  } catch (error) {
    console.error('❌ حدث خطأ أثناء إنشاء مستخدم المدير:', error);
  } finally {
    mongoose.connection.close();
  }
};

createAdminUser();

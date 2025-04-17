const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authenticateToken = require('../middleware/authMiddleware');

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // البحث عن المستخدم
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'اسم المستخدم غير موجود' });
    }

    // التحقق من كلمة المرور
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'كلمة المرور غير صحيحة' });
    }

    // تحديد مدة انتهاء التوكن (15 يومًا)
    const expiresIn = 15 * 24 * 60 * 60; 
    const expirationDate = Date.now() + expiresIn * 1000; 

    // توليد التوكن مع تاريخ انتهاء الصلاحية
    const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET, { expiresIn: '15d' });

    return res.json({ 
      message: 'تم تسجيل الدخول بنجاح', 
      token, 
      expiresAt: expirationDate
    });

  } catch (error) {
    console.error('❌ حدث خطأ أثناء تسجيل الدخول:', error);
    return res.status(500).json({ message: 'حدث خطأ أثناء تسجيل الدخول' });
  }
});

router.get('/profile', authenticateToken, async (req, res) => {
  try {
    // البحث عن المستخدم باستخدام اسم المستخدم الموجود في التوكن
    const user = await User.findOne({ username: req.user.username });
    if (!user) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    // إرجاع الحقول المطلوبة
    res.json({
      username: user.username,
      name: user.name,
      address: user.address,
      phone: user.phone,
      age: user.age,
      profileImage: user.profileImage,
      logo: user.logo
    });
  } catch (error) {
    console.error('❌ حدث خطأ أثناء جلب بيانات الملف الشخصي:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب بيانات الملف الشخصي' });
  }
});

// Endpoint لتحديث الملف الشخصي (الحقول اختيارية)
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    // استخراج الحقول المرسلة من العميل (كلها اختيارية)
    const { name, address, phone, age, profileImage, logo } = req.body;
    const updatedFields = {};
    if (name !== undefined) updatedFields.name = name;
    if (address !== undefined) updatedFields.address = address;
    if (phone !== undefined) updatedFields.phone = phone;
    if (age !== undefined) updatedFields.age = age;
    if (profileImage !== undefined) updatedFields.profileImage = profileImage;
    if (logo !== undefined) updatedFields.logo = logo;

    // تحديث المستخدم استناداً إلى اسم المستخدم الموجود في التوكن
    const updatedUser = await User.findOneAndUpdate(
      { username: req.user.username },
      { $set: updatedFields },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    res.json({ 
      message: 'تم تحديث الملف الشخصي بنجاح',
      user: {
        username: updatedUser.username,
        name: updatedUser.name,
        address: updatedUser.address,
        phone: updatedUser.phone,
        age: updatedUser.age,
        profileImage: updatedUser.profileImage,
        logo: updatedUser.logo
      }
    });
  } catch (error) {
    console.error('❌ حدث خطأ أثناء تحديث الملف الشخصي:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء تحديث الملف الشخصي' });
  }
});

// مثال لمسار عام GET /public-profile-no-username
// يعيد بيانات مستخدم واحد فقط (مثلاً أول مستخدم في قاعدة البيانات)
router.get('/public-profile-no-username', async (req, res) => {
  try {
    // البحث عن "أول مستخدم" في قاعدة البيانات
    const user = await User.findOne(); 
    if (!user) {
      return res.status(404).json({ message: 'لا يوجد مستخدم في قاعدة البيانات' });
    }

    // إعادة البيانات المطلوبة فقط: الاسم + الصورة الشخصية + اللوجو
    res.json({
      name: user.name,
      profileImage: user.profileImage,
      logo: user.logo
    });
  } catch (error) {
    console.error('❌ حدث خطأ أثناء جلب الملف الشخصي العام:', error);
    res.status(500).json({ message: 'حدث خطأ أثناء جلب الملف الشخصي العام' });
  }
});


module.exports = router;
const express = require('express');
const cors = require('cors');
const http = require('http'); // لاستخدام http server مع Socket.IO
const { Server } = require('socket.io'); // لاستعمال Socket.IO
require('dotenv').config(); // لقراءة متغيرات البيئة من ملف .env
const connectDB = require('./config/db'); // ملف الاتصال بقاعدة البيانات
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes'); // سنمرر io لهذا الملف
const supplierRoutes = require('./routes/supplierController'); // ملف مسارات الموردين

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'https://store-management-467c1.web.app'],
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 5000;

// إعداد CORS وزيادة حجم الطلبات
app.use(
  cors({
    origin: ['http://localhost:5173', 'https://store-management-467c1.web.app'],
    credentials: true,
  })
);
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// التحقق من المتغيرات البيئية
if (!process.env.JWT_SECRET || !process.env.MONGODB_URI) {
  console.error('خطأ: تأكد من إعداد المتغيرات البيئية في ملف .env');
  process.exit(1);
}

// الاتصال بقاعدة البيانات
connectDB();

// ربط مسارات المصادقة والفئات والموردين
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes(io)); // تمرير io إلى مسارات الفئات
app.use('/api/suppliers', supplierRoutes(io));  // تمرير io إلى مسارات الموردين

// إعداد Socket.IO
io.on('connection', (socket) => {
  console.log('عميل متصل');
  socket.on('newSale', (data) => {
    console.log('تم إضافة عملية بيع جديدة:', data);
    io.emit('saleAdded', { message: 'تم إضافة عملية بيع جديدة', sale: data });
  });
  socket.on('disconnect', () => {
    console.log('العميل مفصول');
  });
});

// بدء تشغيل الخادم
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

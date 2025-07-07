const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const supplierRoutes = require('./routes/supplierController');
const salesRoutes = require('./routes/sales');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
 

 cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174' , 'https://adminrestaurant-e9141.web.app', 'https://store-management-467c1.web.app', 'https://restaurant-d5367.web.app' , 'https://restaurant-d5367.web.app' , ' https://adminrestaurant-e9141.web.app'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:5174' , 'https://adminrestaurant-e9141.web.app', 'https://store-management-467c1.web.app', 'https://restaurant-d5367.web.app' , 'https://restaurant-d5367.web.app' , ' https://adminrestaurant-e9141.web.app'],
    credentials: true,
  })
);
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

if (!process.env.JWT_SECRET || !process.env.MONGODB_URI) {
  console.error('خطأ: تأكد من إعداد المتغيرات البيئية في ملف .env');
  process.exit(1);
}

connectDB();

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes(io));
app.use('/api/suppliers', supplierRoutes(io));
app.use('/api/sales', salesRoutes(io));

const generateVerificationCode = () => {
  return crypto.randomInt(100000, 999999).toString();
};

app.post("/api/send-verification-code", async (req, res) => {
  const { email, toName, fromName } = req.body;
  try {
    const code = generateVerificationCode();
    res.status(200).json({ message: "Verification code sent successfully!", code });
  } catch (error) {
    console.error("Failed to send verification code:", error);
    res.status(500).json({ message: "Failed to send verification code." });
  }
});

app.post("/api/verify-code", (req, res) => {
  const { userCode, serverCode } = req.body;
  if (userCode === serverCode) {
    res.status(200).json({ message: "Verification successful!" });
  } else {
    res.status(400).json({ message: "Incorrect verification code." });
  }
});

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

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
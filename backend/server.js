const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const posRoutes = require('./routes/pos');
const adminRoutes = require('./routes/admin');
const cashierRoutes = require('./routes/cashier');
const employeeRoutes = require('./routes/employees');
const supplierRoutes = require('./routes/suppliers');
const inventoryRoutes = require('./routes/inventory');
const User = require('./models/User');
const { attachInventorySync } = require('./services/inventorySync');

dotenv.config();

const seedDefaultUsers = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@modapella.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
    const cashierEmail = process.env.CASHIER_EMAIL || 'cashier@modapella.com';
    const cashierPassword = process.env.CASHIER_PASSWORD || 'Cashier123!';

    const [adminUser, cashierUser] = await Promise.all([
      User.findOne({ email: adminEmail.toLowerCase() }),
      User.findOne({ email: cashierEmail.toLowerCase() })
    ]);

    if (!adminUser) {
      await new User({ name: 'System Admin', email: adminEmail, password: adminPassword, role: 'admin' }).save();
    }

    if (!cashierUser) {
      await new User({ name: 'Store Cashier', email: cashierEmail, password: cashierPassword, role: 'cashier' }).save();
    }

    console.log('Default users ready');
  } catch (error) {
    console.error('User seed failed:', error.message);
  }
};

connectDB().then(seedDefaultUsers);

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173,https://moda-pella.vercel.app').split(',').map((origin) => origin.trim()).filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.includes(origin) || 
                      origin.endsWith('.vercel.app') || 
                      origin.startsWith('http://localhost:') || 
                      origin.startsWith('http://127.0.0.1:');
                      
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cashier', cashierRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/inventory', inventoryRoutes);

app.get('/api/status', (req, res) => {
  res.json({ service: 'Moda Pella POS & E-commerce API', status: 'ok' });
});

const frontendDistPath = path.resolve(__dirname, '../frontend/dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ message: 'API route not found' });
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

attachInventorySync(io);

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

app.locals.io = io;

const port = process.env.PORT || 5000;
if (!process.env.VERCEL) {
  server.listen(port, () => {
    console.log(`Moda Pella backend listening on port ${port}`);
  });
}

module.exports = app;

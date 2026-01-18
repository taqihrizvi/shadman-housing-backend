import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from './config/database.js';
import { apiLimiter, sanitizeInput, securityLogger, enforceHTTPS } from './middleware/security.js';

// Import routes
import authRoutes from './routes/auth.js';
import inventoryRoutes from './routes/inventory.js';
import customerRoutes from './routes/customer.js';
import formRoutes from './routes/forms.js';
import voucherRoutes from './routes/voucher.js';
import reportRoutes from './routes/report.js';
import approvalRoutes from './routes/approvals.js';
import notificationRoutes from './routes/notifications.js';
import transferRoutes from './routes/transfer.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Enhanced security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "http://localhost:8080"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS - Allow frontend origins
const allowedOrigins = [
  'http://localhost:8080',
  'https://shadman-housing-frontend.onrender.com',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 hours
}));

// Rate limiting for all API routes
app.use('/api/', apiLimiter);

// Security logging
app.use(securityLogger);

// Request logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization to prevent NoSQL injection
app.use(sanitizeInput);

// HTTPS enforcement for sensitive endpoints in production
if (process.env.NODE_ENV === 'production') {
  app.use('/api/auth', enforceHTTPS);
  app.use('/api/forms', enforceHTTPS);
  app.use('/api/approvals', enforceHTTPS);
}

// Serve static files from public directory
app.use('/signatures', express.static(path.join(__dirname, 'public/signatures')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/transfer', transferRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Database connection test and server start
const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL connected successfully');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

startServer();

export default app;

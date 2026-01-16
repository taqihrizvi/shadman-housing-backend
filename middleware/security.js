import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';

// Rate limiting for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 30 * 1000, // 30 seconds (for testing)
  max: 5, // 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 30 seconds.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for general API endpoints
export const apiLimiter = rateLimit({
  windowMs: 30 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for file uploads
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: {
    success: false,
    message: 'Too many file uploads. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Sanitize user input to prevent NoSQL injection
export const sanitizeInput = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`⚠️ Potential injection attempt detected in ${key}`);
  },
});

// Security logging middleware
export const securityLogger = (req, res, next) => {
  const originalJson = res.json;
  
  res.json = function(data) {
    // Log failed authentication attempts
    if (req.path.includes('/login') && !data.success) {
      console.warn(`🚨 Failed login attempt:`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        timestamp: new Date().toISOString(),
        path: req.path,
      });
    }
    
    // Log successful authentication
    if (req.path.includes('/login') && data.success) {
      console.log(`✅ Successful login:`, {
        user: data.user?.username,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Log approval actions
    if (req.path.includes('/approve') || req.path.includes('/reject')) {
      console.log(`📝 Approval action:`, {
        action: req.path.includes('/approve') ? 'APPROVE' : 'REJECT',
        user: req.user?.username,
        role: req.user?.role,
        resource: req.path,
        timestamp: new Date().toISOString(),
      });
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};

// HTTPS enforcement middleware (for production)
export const enforceHTTPS = (req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.status(403).json({
      success: false,
      message: 'HTTPS is required for this endpoint',
    });
  }
  next();
};

// Request validation helper
export const validateRequest = (schema) => {
  return (req, res, next) => {
    console.log('🔍 Validating request body:', JSON.stringify(req.body, null, 2));
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      
      console.log('❌ Validation errors:', JSON.stringify(errors, null, 2));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }
    
    console.log('✅ Validation passed');
    next();
  };
};

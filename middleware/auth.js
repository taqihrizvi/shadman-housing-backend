import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      console.warn('🔒 No token provided for:', req.method, req.path);
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route',
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
        },
      });
      
      if (!req.user || !req.user.isActive) {
        console.warn('🔒 User not found or inactive:', decoded.id);
        return res.status(401).json({
          success: false,
          message: 'User not found or inactive',
        });
      }

      console.log('✅ Auth successful:', req.user.email, req.user.role);
      next();
    } catch (error) {
      console.error('🔒 Token verification failed:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route',
      });
    }
  } catch (error) {
    console.error('🔒 Auth middleware error:', error);
    next(error);
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`,
      });
    }
    next();
  };
};

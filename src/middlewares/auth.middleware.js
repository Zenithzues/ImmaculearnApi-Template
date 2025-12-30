// middleware/auth.middleware.js
import jwt from 'jsonwebtoken';
import { Logger } from '../utils/Logger.js';
import User from '../models/MySQL/UserModel.js';

const logger = new Logger('AuthMiddleware');

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from MySQL
    const userModel = new User();
    const user = await userModel.get(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user role
    const emailCheck = await userModel.findByEmail(user.email);
    
    // Attach user to request
    req.user = {
      account_id: user.account_id,
      email: user.email,
      role: emailCheck?.role
    };

    // Update last active timestamp (optional)
    await userModel.updateUserStatus(user.account_id, 'online');

    logger.debug('User authenticated', {
      account_id: user.account_id,
      role: emailCheck?.role,
      endpoint: req.originalUrl
    });

    next();
  } catch (error) {
    logger.error('Authentication failed', { error: error.message });
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

export const roleMiddleware = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Unauthorized role access', {
        account_id: req.user.account_id,
        role: req.user.role,
        required: roles,
        endpoint: req.originalUrl
      });
      
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};
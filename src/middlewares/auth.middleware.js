// middleware/auth.middleware.js
import jwt from 'jsonwebtoken';
import { Logger } from '../utils/Logger.js';
import User from '../models/MySQL/UserModel.js';

const logger = new Logger('AuthMiddleware');

import { AuthController } from '../controllers/v1/authController.js';

// Create controller instance
const authController = new AuthController();

export const authenticate = async (req, res, next) => {
  try {
    // Get token
    const token = req.cookies.accessToken || 
                  req.headers.authorization?.replace('Bearer ', '');
    
    // If no token, check refresh token

    console.log(token)
    if (!token) {
      const refreshToken = req.cookies.refreshToken;
      console.log(refreshToken)
      if (refreshToken) {
        // Try to refresh using the controller
        // We need to intercept the response
        await callRefreshAndHandleResponse(authController, req, res);
        
        // Check if new token was set
        const newToken = req.cookies.accessToken;
        if (newToken) {
          const decoded = jwt.verify(newToken, process.env.JWT_SECRET);
          req.user = { userId: decoded.userId, role: decoded.role };
          return next();
        }
      }
      
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { userId: decoded.userId, role: decoded.role };
      return next();
    } catch (err) {
      // Token expired or invalid, try refresh
      if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
        const refreshToken = req.cookies.refreshToken;
        
        if (refreshToken) {
          // Call the refresh method
          await callRefreshAndHandleResponse(authController, req, res);
          
          // Check if new token was set
          const newToken = req.cookies.accessToken;
          if (newToken) {
            const decoded = jwt.verify(newToken, process.env.JWT_SECRET);
            req.user = { userId: decoded.userId, role: decoded.role };
            return next();
          }
        }
        
        return res.status(401).json({
          success: false,
          message: 'Session expired. Please login again.'
        });
      }
      
      // Other JWT error
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Helper function to call refresh and handle response
async function callRefreshAndHandleResponse(authController, req, res) {
  // Store original response methods
  const originalJson = res.json;
  const originalStatus = res.status;
  
  let refreshSuccess = false;
  
  // Override response methods to capture
  res.json = function(data) {
    refreshSuccess = data.success === true;
    // Don't send response, just capture
    return this;
  };
  
  res.status = function(code) {
    return this;
  };
  
  try {
    await authController.refresh(req, res);
  } finally {
    // Restore original methods
    res.json = originalJson;
    res.status = originalStatus;
  }
  
  return refreshSuccess;
}



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
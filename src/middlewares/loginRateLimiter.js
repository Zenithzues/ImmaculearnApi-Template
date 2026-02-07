import rateLimit from 'express-rate-limit';

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                  // 5 login attempts per IP
  standardHeaders: true,   // RateLimit-* headers
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later'
  }
});

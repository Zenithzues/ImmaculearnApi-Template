import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JWT_SECRET, ACCESS_TOKEN_EXPIRES } from '../config.js';

/**
 * Generate a JWT access token
 * @param {number|string} userId
 * @returns {string} JWT token
 */
export function generateAccessToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });
}

/**
 * Generate a random refresh token
 * @returns {string} random token (~43 chars)
 */
export function generateRefreshToken() {
  return crypto.randomBytes(32).toString('base64url');
}

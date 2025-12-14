import dotenv from 'dotenv';
dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET;
export const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || '15m';
export const REFRESH_TOKEN_EXPIRES_DAYS = process.env.REFRESH_TOKEN_EXPIRES_DAYS || 30;

import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config.js";

/**
 * Authentication for logged in users
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export default function authentication(req, res, next) {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthenticated user",
    });
  }

  try {
    // Use synchronous verify instead of callback
    const decoded = jwt.verify(token, JWT_SECRET);

    res.locals.account_id = decoded.userId;
    res.locals.authenticated = true;
    next();
  } catch (err) {
    // Token verification failed (expired or invalid)
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}

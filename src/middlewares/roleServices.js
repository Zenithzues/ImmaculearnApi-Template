/**
 * require role middleware for checking if `role` is valid to add user
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next 
 */
export default function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const role = res.locals.role; // should be set earlier in your auth process (JWT decode, etc.)

    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden - You do not have permission to perform this action',
      });
    }

    next();
  };
}
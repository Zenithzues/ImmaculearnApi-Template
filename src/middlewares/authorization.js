/**
 * authorization middleware for checking if `apikey` is valid
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export default function authorization(req, res, next) {
  const apikey = req.headers.apikey;

  if (!apikey || apikey !== process.env.API_KEY) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  next();
}

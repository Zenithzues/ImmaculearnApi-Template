/**
 * authorization middleware for checking if `apikey` is valid
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next 
 */
export default function authorization(req, res, next) {
  // const apikey = req.headers.apikey;
  const authHeader = req.headers.authorization; // read Authorization header
  const apikey = authHeader && authHeader.split(" ")[1]; // extract token

  if (!apikey || (apikey && apikey !== process.env.API_KEY)) {
    res.json({
      'success': false,
      'message': 'Unauthorized',
    });
    return;
  }

  next();
}


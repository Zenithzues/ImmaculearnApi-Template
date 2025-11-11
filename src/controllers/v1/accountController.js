import jwt from 'jsonwebtoken';
import User from '../../models/user.js';

class AccountController {
  constructor() {
    this.user = new User();
  }

  /**
   * Create account controller
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @returns {void}
   *
   */
  async create(req, res) {
    const { username, password, fullname } = req.body || {};

    try {
      // @TODO: verify if username already exists
      const response = await this.user.create(username, password, fullname);

      res.json({
        success: true,
        data: {
          recordIndex: response?.insertId
        },
      });
      res.end();
    } catch (err) {
      res.json({
        success: false,
        message: err.toString(),
      });
      res.end();
    }
  }

  /**
   *  Login Controller
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @returns {void}
   */
  async login(req, res) {
    try {
      const { email, password } = req.body || {};

      console.log(email, password)
      const result = await this.user.verify(email, password);

      if (!result?.account_id) {
        return res.json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      res.json({
        success: true,
        data: {
          token: jwt.sign({ 'email': email, 'account_id': result?.account_id }, process.env.API_SECRET_KEY, {
            expiresIn: process.env.JWT_EXPIRES_IN || '90d',
          }),
        }
      });
      res.end();
    } catch (err) {
      res.json({
        success: false,
        message: err.toString(),
      });
      res.end()
    }
  }

  /**
   * Get user profile
   *
   * @todo Update this to pull from database
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @returns {void}
   *
   */
  async profile(req, res) {
    try {
      const userInfo = await this.user.get(res.locals.account_id);

      res.json({
        success: true,
        data: {
          account_id: res.locals.account_id,
          fullname: userInfo?.f_name + ' ' + userInfo?.l_name,
        }
      })
      res.end();
    } catch (err) {a
      res.json({
        success: false,
        message: err.toString(),
      });
    }
  }
}

export default AccountController;

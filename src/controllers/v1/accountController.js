import jwt from 'jsonwebtoken';
import User from '../../models/user.js';
import socket from '../../core/socket.js';
import jwtService from '../../services/jwtService.js';
import axios from 'axios';

class AccountController {
  constructor() {
    this.user = new User();
  }


  async oauthGoogleRedirect(req, res) {
    const role = req.query.role;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const scope = [
      "openid",
      "email",
      "profile"
    ].join(" ");

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&access_type=offline` +
      `&prompt=consent`;

    const state = Buffer.from(JSON.stringify({ role })).toString('base64');
    return res.redirect(authUrl + `&state=${state}`);
  }

  // STEP 2: Google redirects back with ?code=
  async oauthGoogleCallback(req, res) {
    try {
      const code = req.query.code;
      const state = req.query.state;

      if (!code) return res.status(400).json({ error: "Code missing in callback" });

      // Decode role from state
      const { role } = JSON.parse(Buffer.from(state, 'base64').toString());

      // Exchange code for access token
      const tokenRes = await axios.post(
        "https://oauth2.googleapis.com/token",
        {
          code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: process.env.GOOGLE_REDIRECT_URI,
          grant_type: "authorization_code",
        },
        { headers: { "Content-Type": "application/json" } }
      );

      const { access_token } = tokenRes.data;

      // Fetch Google profile
      const userInfoRes = await axios.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        { headers: { Authorization: `Bearer ${access_token}` } }
      );

      const { sub: googleId, email, name, picture } = userInfoRes.data;

      // Find or create partial user with role
      const { user, tempToken, needsOnboarding } = await this.findOrCreate({
        googleId,
        email,
        name,
        picture,
        role
      });

      if (needsOnboarding) {
        // New user → redirect to onboarding page with tempToken
        return res.json({
          message: "Onboarding required",
          tempToken,
          user,
        });
      }

      // Existing user → generate JWT
      const sessionToken = jwtService.sign({ id: user.id });

      return res.json({
        message: "Google login successful",
        token: sessionToken,
        user,
      });

    } catch (error) {
      console.error("OAuth error:", error.response?.data || error.message);
      return res.status(500).json({
        error: "OAuth failed",
        details: error.response?.data || error.message
      });
    }
  }


  async findOrCreate({ googleId, email, name, picture, role }) {
    let user = await this.user.findByGoogleId(googleId);
    let tempToken = null;
    let needsOnboarding = false;

    if (!user) {
      // Create partial account and profile based on role
      user = await this.user.createPartialGoogleUser({ googleId, email, name, picture, role });

      // Generate temporary token for onboarding (short-lived, e.g., 15m)
      tempToken = jwtService.sign({ id: user.id }, '15m');
      needsOnboarding = true;
    }

    return { user, tempToken, needsOnboarding };
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
    const { email, password } = req.body || {};

    try {
      // @TODO: verify if username already exists
      const response = await this.user.create(email, password);

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

      const io = socket.getIO();

      io.emit("user:login", { userId: result?.account_id, email: email})

      console.log(
        {
          success: true,
          data: {
            token: jwt.sign({ 'email': email, 'account_id': result?.account_id }, process.env.API_SECRET_KEY, {
              expiresIn: process.env.JWT_EXPIRES_IN || '90d',
            }),
          }
        }
      )

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
          account_id: userInfo?.account_id,
          userEmail: userInfo?.email,
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

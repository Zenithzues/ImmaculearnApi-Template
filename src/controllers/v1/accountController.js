import crypto from 'crypto'
import User from '../../models/user.js';
import socket from '../../core/socket.js';
import jwtService from '../../services/jwtService.js';
import axios from 'axios';
import { generateAccessToken, generateRefreshToken } from '../../utils/tokens.js';
import { UserToken } from '../../models/userToken.js';

class AccountController {
  constructor() {
    this.user = new User();
    this.userTokenModel = new UserToken();
  }


  async oauthGoogleRedirect(req, res) {
    const role = req.query.role;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    console.log(redirectUri)
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

    console.log(authUrl)

    const state = Buffer.from(JSON.stringify({ role })).toString('base64');
    return res.redirect(authUrl + `&state=${state}`);
  }

  // STEP 2: Google redirects back with ?code=
  async oauthGoogleCallback(req, res) {
    try {
      const code = req.query.code;
      // const state = req.query.state;

      if (!code) return res.redirect("http://localhost:5173/login?error=oauth_failed")

      // Decode role from state
      // const { role } = JSON.parse(Buffer.from(state, 'base64').toString());

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
      const result = await this.findOrCreate({
        googleId,
        email,
        name,
        picture,
        // role
      });

      if (!result) return res.redirect("http://localhost:5173/login?error=not_registered");

      const { user, role, tempToken, needsOnboarding} = result;

      console.log("NEEEDSSS ON BOARDING:",needsOnboarding)

      if (needsOnboarding) {
        // return res.redirect(`http://localhost:5173/onboarding?role=${role}`)
        return res.redirect(`http://localhost:5173/oauth/callback?needsOnboarding=${needsOnboarding}&role=${role}&tempToken=${tempToken}`);

        // New user → redirect to onboarding page with tempToken
        // return res.json({
        //   message: "Onboarding required",
        //   tempToken,
        //   user,
        // });
      }

      // Existing user → generate JWT
      const sessionToken = jwtService.sign({ id: user.id });

      // return res.redirect("http://localhost:5173/home");
      return res.redirect(`http://localhost:5173/oauth/callback?role=${role}&tempToken=${tempToken}`);


    } catch (error) {
      console.error("OAuth error:", error.response?.data || error.message);
      return res.redirect("http://localhost:5173/login?error=oauth_failed");
    }
  }


  async findOrCreate({ googleId, email, name, picture }) {
    let user = await this.user.findByGoogleId(googleId);
    let tempToken = null;
    let needsOnboarding = false;
    let role = null;

    if (!user) {

      const {email: existingEmail, role: fetchRole} = await this.user.findByEmail(email);

      console.log(existingEmail, fetchRole)

      if (!existingEmail) return null
      // Create partial account and profile based on role
      user = await this.user.createPartialGoogleUser({ googleId, email: existingEmail.email, name, picture });

      // Generate temporary token for onboarding (short-lived, e.g., 15m)
      tempToken = jwtService.sign({ id: user.id }, '15m');
      needsOnboarding = true;
      role = fetchRole;
    }

    return { user, role, tempToken, needsOnboarding };
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

      if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email and password required" });
      }

      // Verify user credentials
      const user = await this.user.verify(email, password);

      if (!user?.account_id) {
        return res.status(401).json({ success: false, message: "Invalid email or password" });
      }

      const userId = user.account_id;

      // Generate tokens
      const accessToken = generateAccessToken(userId); // Implement your JWT access token function
      const refreshToken = generateRefreshToken();     // Implement your JWT refresh token function

      // Hash refresh token before storing
      const hashedRefresh = crypto.createHash("sha256").update(refreshToken).digest("hex");

      // Save hashed refresh token in DB
      const existing = await this.userTokenModel.findByUserId(userId);

      if (existing) {
        await this.userTokenModel.update(userId, hashedRefresh);
      } else {
        await this.userTokenModel.create(userId, hashedRefresh);
      }

      // Optionally: emit a socket event for login
      const io = socket.getIO();
      io.emit("user:login", { userId, email });

      // Return tokens to client
      res.json({
        success: true,
        data: {
          accessToken,
          refreshToken, // send the plain refresh token to client; store only hashed version
        },
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ success: false, message: err.toString() });
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

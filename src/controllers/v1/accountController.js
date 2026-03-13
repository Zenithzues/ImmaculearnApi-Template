import crypto from "crypto";
// import User from '../../models/user.js';
import socket from "../../core/socket.js";
import jwtService from "../../services/jwtService.js";
import axios from "axios";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../utils/tokens.js";
// import { UserToken } from '../../models/userToken.js';
import { UserToken } from "../../models/MySQL/UserToken.js";
import User from "../../models/MySQL/UserModel.js";

class AccountController {
  constructor() {
    this.user = new User();
    this.userTokenModel = new UserToken();
  }

  async oauthGoogleRedirect(req, res) {
    const role = req.query.role;
    const redirectUri =
      process.env.NODE_ENV === "production"
        ? process.env.GOOGLE_REDIRECT_URI_DEPLOYED
        : process.env.GOOGLE_REDIRECT_URI;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    console.log(redirectUri);
    const scope = ["openid", "email", "profile"].join(" ");

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&access_type=offline` +
      `&prompt=consent`;

    console.log(authUrl);

    const state = Buffer.from(JSON.stringify({ role })).toString("base64");
    return res.redirect(authUrl + `&state=${state}`);
  }

  // STEP 2: Google redirects back with ?code=
  async oauthGoogleCallback(req, res) {
    try {
      const code = req.query.code;
      if (!code) throw new Error("No code received from Google");

      // 1️⃣ Exchange code for tokens
      const tokenRes = await axios.post(
        "https://oauth2.googleapis.com/token",
        {
          code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri:
            process.env.NODE_ENV === "production"
              ? process.env.GOOGLE_REDIRECT_URI_DEPLOYED
              : process.env.GOOGLE_REDIRECT_URI,
          grant_type: "authorization_code",
        },
        { headers: { "Content-Type": "application/json" } },
      );

      const { access_token } = tokenRes.data;

      // 2️⃣ Get Google user info
      const userInfoRes = await axios.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        { headers: { Authorization: `Bearer ${access_token}` } },
      );

      const { sub: googleId, email, name, picture } = userInfoRes.data;

      // 3️⃣ Find or create user in DB
      const result = await this.findOrCreate({
        googleId,
        email,
        name,
        picture,
      });
      if (!result) throw new Error("User not registered");

      const { user, role, tempToken, needsOnboarding } = result;

      // 4️⃣ Generate app tokens
      const accessToken = generateAccessToken(user.account_id, role);
      const refreshToken = generateRefreshToken();

      // Optional: hash refresh token and store in DB
      const hashedRefresh = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");
      const existingToken = await this.userTokenModel.findByUserId(
        user.account_id,
      );
      if (existingToken) {
        await this.userTokenModel.update(user.account_id, hashedRefresh);
      } else {
        await this.userTokenModel.create(user.account_id, hashedRefresh);
      }

      // 5️⃣ Set cookies (cross-site safe)
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Strict",
        path: "/",
      };

      console.log(cookieOptions);

      res.cookie("accessToken", accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000,
      });
      res.cookie("refreshToken", JSON.stringify({ refreshToken, role }), {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      console.log("SENDING TO FRONTENDDDD");
      res.send(`
      <html>
        <body>
          <script>
            window.opener.postMessage(
              {
                type: "OAUTH_SUCCESS",
                role: "${role}",
                needsOnboarding: ${needsOnboarding},
                token: "${tempToken || ""}"
              },
              "${process.env.NODE_ENV === "production" ? process.env.CLIENT_URL : "http://localhost:5173"}"
            );
            window.close();
          </script>
        </body>
      </html>
    `);
    } catch (err) {
      console.error("OAuth error:", err.response?.data || err.message);
      res.send(`
      <html>
        <body>
          <script>
            window.opener.postMessage(
              { type: "OAUTH_ERROR", error: "${err.message}" },
              "${process.env.NODE_ENV === "production" ? process.env.CLIENT_URL : "http://localhost:5173"}"
            );
            window.close();
          </script>
        </body>
      </html>
    `);
    }
  }

  async findOrCreate({ googleId, email, name, picture }) {
    let user = await this.user.findByEmail(email);

    console.log(user);
    if (!user) return null;

    let role = user.role;
    let tempToken = null;
    let needsOnboarding = false;

    user = await this.user.findByGoogleId(googleId);

    console.log(user);

    if (!user) {
      const results = await this.user.findByEmail(email);

      if (!results) return null;

      console.log(results);

      const { email: existingEmail, role: fetchRole } = results;
      // console.log(existingEmail, fetchRole)

      // if (!existingEmail) return
      // Create partial account and profile based on role
      user = await this.user.createPartialGoogleUser({
        googleId,
        email: existingEmail,
        name,
        picture,
      });

      // Generate temporary token for onboarding (short-lived, e.g., 15m)
      tempToken = jwtService.sign({ id: user.account_id, email }, "15m");
      needsOnboarding = true;
      role = fetchRole;
    }

    return { user, role, tempToken, needsOnboarding };
  }

  async create_space(req, res) {
    try {
      const { space_name, space_description } = req.body || {};
      const account_id = req.params.account_id || null;

      const result = await this.user.createSpace(
        account_id,
        space_name,
        space_description,
      );

      // if (!result) res.json({ success: false, message: "Failed to create Space!"})

      res.json({
        success: true,
        message: "Creating Space Successfully!",
        space_uuid: result.space_uuid,
      });
    } catch (err) {
      res.json({
        success: false,
        message: err.toString(),
      });
      res.end();
    }
  }

  async get_space_by_id(req, res) {
    try {
      // const {space_name, space_description} = req.body || {};
      const { space_id } = req.params || {};
      // const space_id = req.query.space_id

      const result = await this.user.getBySpaceId(space_id);

      if (result.length === 0)
        return res.json({ success: true, message: "Can't find space" });

      res.json({
        success: true,
        data: {
          space: {
            space_link:
              process.env.NODE_ENV === "production"
                ? `${process.env.CLIENT_URL}/space/${result.space_uuid}`
                : `immaculearn.collab.app/space/${result.space_uuid}`,
            space_name: result.space_name,
            space_description: result.description,
          },
        },
        // space_id: space_id,
        // account_id: account_id
      });
    } catch (err) {
      res.json({
        success: false,
        message: err.toString(),
      });
      res.end();
    }
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
    const {
      email,
      password,
      role,
      first_name,
      last_name,
      birthdate,
      gender,
      course,
      year_level,
      department,
    } = req.body || {};

    try {
      // 1️⃣ Validate base fields
      if (!email || !password || !role) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }

      // 2️⃣ Validate role-specific fields
      if (role === "student") {
        if (
          !first_name ||
          !last_name ||
          !birthdate ||
          !gender ||
          !course ||
          !year_level
        ) {
          return res.status(400).json({
            success: false,
            message: "Incomplete student profile data",
          });
        }
      }

      if (role === "professor") {
        if (!first_name || !last_name || !birthdate || !gender || !department) {
          return res.status(400).json({
            success: false,
            message: "Incomplete professor profile data",
          });
        }
      }

      // 3️⃣ Create account
      const account = await this.user.create(email, password, role);

      const accountId = account.insertId;

      // 4️⃣ Create profile
      if (role === "student") {
        await this.user.createStudentProfile({
          account_id: accountId,
          first_name,
          last_name,
          birthdate,
          gender,
          course,
          year_level,
        });
      }

      if (role === "professor") {
        await this.user.createProfessorProfile({
          account_id: accountId,
          first_name,
          last_name,
          birthdate,
          gender,
          department,
        });
      }

      return res.status(201).json({
        success: true,
        data: {
          account_id: accountId,
        },
      });
    } catch (err) {
      // Duplicate email (MySQL)
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          success: false,
          message: "Email already exists",
        });
      }

      console.error("Create account error:", err);

      return res.status(500).json({
        success: false,
        message: "Failed to create account",
      });
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

      console.log(email);

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password required",
        });
      }

      const user = await this.user.verify(email, password);

      if (!user?.account_id) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      const userId = user.account_id;

      const accessToken = generateAccessToken(userId, user.role);
      const refreshToken = generateRefreshToken();

      const hashedRefresh = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      const existing = await this.userTokenModel.findByUserId(userId);

      if (existing) {
        await this.userTokenModel.update(userId, hashedRefresh);
      } else {
        await this.userTokenModel.create(userId, hashedRefresh);
      }

      const tempToken = jwtService.sign({ id: userId, email }, "15m");

      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Strict",
        maxAge: 15 * 60 * 1000,
      });

      res.cookie(
        "refreshToken",
        JSON.stringify({
          refreshToken,
          role: user.role,
        }),

        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "None" : "Strict",
          maxAge: 30 * 24 * 60 * 60 * 1000,
        },
      );

      return res.status(200).json({
        success: true,
        data: [
          {
            role: user.role,
            needsOnboarding: user.needsOnboarding || false,
            tempToken: user.needsOnboarding ? tempToken : "",
          },
        ],
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({
        success: false,
        message: err.toString(),
      });
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
        },
      });
      res.end();
    } catch (err) {
      a;
      res.json({
        success: false,
        message: err.toString(),
      });
    }
  }

  async register(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res
        .status(401)
        .json({ success: false, message: "Missing temp tokens" });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwtService.verify(token);
    } catch {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired token" });
    }

    const { id, email } = decoded;

    const {
      role,
      password,
      first_name,
      last_name,
      birthdate,
      gender,
      course,
      year_level,
      department,
    } = req.body || {};

    try {
      // Validate required fields
      if (!email || !password || !role) {
        return res
          .status(400)
          .json({ success: false, message: "Missing required fields" });
      }

      // Validate email is allowed
      const registered = await this.user.findByEmail(email);
      if (!registered || registered.role !== role) {
        return res.status(403).json({
          success: false,
          message: "Email is not authorized for this role",
        });
      }

      // Complete onboarding
      if (role === "student") {
        await this.user.completeStudentOnboarding(id, {
          f_name: first_name,
          l_name: last_name,
          birthdate,
          gender,
          department_id: course,
          year_level,
          password,
        });
      }

      if (role === "professor") {
        await this.user.completeProfessorOnboarding(id, {
          f_name: first_name,
          l_name: last_name,
          birthdate,
          gender,
          department,
          password,
        });
      }

      // ✅ Generate access & refresh tokens
      const accessToken = generateAccessToken(id, role);
      const refreshToken = generateRefreshToken();

      // Hash refresh token and store in DB
      const hashedRefresh = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");
      const existingToken = await this.userTokenModel.findByUserId(id);
      if (existingToken) {
        await this.userTokenModel.update(id, hashedRefresh);
      } else {
        await this.userTokenModel.create(id, hashedRefresh);
      }

      // ✅ Set tokens as HTTP-only cookies
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Strict",
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie("refreshToken", JSON.stringify({ refreshToken, role }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Strict",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Send success response
      return res.status(200).json({
        success: true,
        message: "Onboarding completed",
      });
    } catch (err) {
      console.error("Onboarding error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Failed to complete onboarding" });
    }
  }

  async get_all_space_invites_by_account_id(req, res) {
    try {
      // const userInfo = await this.user.get(res.locals.account_id);

      const account_id = res.locals.account_id;
      const userId = req.params.account_id;

      console.log(userId, account_id);
      if (!account_id)
        return res
          .status(401)
          .json({ success: false, message: "UnAuthenticated User!" });
      if (!userId || Number(userId) !== account_id)
        return res
          .status(401)
          .json({ success: false, message: "Invalid Request" });

      return res.json({ success: true, message: "Successfully Get Invites " });
    } catch (err) {
      res.json({
        success: false,
        message: err.toString(),
      });
    }
  }
}

export default AccountController;

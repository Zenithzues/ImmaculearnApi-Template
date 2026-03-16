import jwt from "jsonwebtoken";
import crypto from "crypto";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../../utils/tokens.js";
import { UserToken } from "../../models/MySQL/UserToken.js";
// import User from '../../models/MySQL/UserModel.js';
import { Logger } from "../../utils/Logger.js";
import { hybridDatabase } from "../../core/HybridDatabase.js";
import { Validator } from "../../utils/Validator.js";
import User from "../../models/MySQL/UserModel.js";

export class AuthController {
  constructor() {
    this.logger = new Logger("AuthController");
    this.userTokenModel = new UserToken();
    this.user = new User();
  }

  async profile(req, res) {
    try {
      const token =
        req.cookies.accessToken ||
        req.headers.authorization?.replace("Bearer ", "");

      // this.logger.debug('Profile request', { hasToken: !!token });

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      let payload;
      try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
        // this.logger.debug('Token verified', { userId: payload.userId, role: payload.role });
      } catch (err) {
        this.logger.warn("Invalid token", { error: err.message });
        return res.status(401).json({
          success: false,
          message: "Invalid or expired token",
        });
      }

      const user = await this.user.findByAccountId(
        payload.userId,
        payload.role,
      );

      if (!user && user.length === 0) {
        this.logger.warn("User not found for profile", {
          userId: payload.userId,
          role: payload.role,
        });
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Update user status to online
      await this.user.updateUserStatus(payload.userId, "online");
      const result = await this.user.getUserStatus(payload.userId);

      // Sync user to Supabase for collaboration features
      // await hybridDatabase.syncUserToSupabase(
      //   payload.userId.toString(),
      //   payload.role,
      // );

      const profileData = {
        id: user[0].account_id,
        email: user[0].email,
        profile_pic: user[0].profile_pic,
        name: user[0].full_name,
        last_name: user[0].student_ln || user[0].prof_ln,
        first_name: user[0].student_fn || user[0].prof_fn,
        bd: user[0].birth_date,
        gender: user[0].gender,
        role: payload.role,
        status: result[0].status,
      };

      // Add role-specific fields
      if (payload.role === "student") {
        profileData.course = user[0].course;
        profileData.yr_lvl = user[0].year_level;
      } else {
        profileData.department = user[0].department;
      }

      // this.logger.info('Profile retrieved', { userId: payload.userId, role: payload.role });

      res.json({
        success: true,
        data: profileData,
      });
    } catch (err) {
      this.logger.error("Profile error", {
        error: err.message,
        stack: err.stack,
      });
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }

  async login(req, res) {
    const timer = this.logger.startTimer("login");

    try {
      const { email, password } = req.body;

      this.logger.info("Login attempt", { email, ip: req.ip });

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      // 1. Check if email is registered
      const emailCheck = await this.user.findByEmail(email);
      if (!emailCheck) {
        this.logger.warn("Email not registered", { email });
        return res.status(401).json({
          success: false,
          message: "Email not registered as student or professor",
        });
      }

      // 2. Validate Gmail requirement
      const emailValidation = Validator.validateEmailWithFeedback(email);
      if (!emailValidation.valid) {
        return res.status(400).json({
          success: false,
          message: emailValidation.message,
        });
      }

      // 3. Verify credentials
      const user = await this.user.verify(email, password);
      if (!user) {
        this.logger.warn("Invalid credentials", { email });
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // 4. Update user status to online
      await this.user.updateUserStatus(user.account_id, "online");

      // 5. Sync user to Supabase
      // await hybridDatabase.syncUserToSupabase(user.account_id.toString());

      // 6. Generate tokens
      const accessToken = generateAccessToken(user.account_id, emailCheck.role);
      const refreshToken = crypto.randomBytes(40).toString("hex");
      const hashedRefresh = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      // 7. Store or update refresh token
      const existing = await this.userTokenModel.findByUserId(user.account_id);
      if (existing) {
        await this.userTokenModel.update(user.account_id, hashedRefresh);
      } else {
        await this.userTokenModel.create(user.account_id, hashedRefresh);
      }

      // 8. Set cookies
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        //sameSite: "None",
        //sameSite: "None",
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie(
        "refreshToken",
        JSON.stringify({
          refreshToken,
          role: emailCheck.role,
        }),
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "Strict",
          //sameSite: "None",
          //sameSite: "None",
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        },
      );

      this.logger.userActivity(user.account_id, "login", {
        success: true,
        ip: req.ip,
        role: emailCheck.role,
        userAgent: req.headers["user-agent"],
      });

      res.json({
        success: true,
        message: "Login successful",
        data: {
          account_id: user.account_id,
          email: user.email,
          role: emailCheck.role,
        },
      });
    } catch (err) {
      this.logger.logError(err, {
        operation: "login",
        email: req.body?.email,
        ip: req.ip,
      });

      res.status(500).json({
        success: false,
        message: "Login failed",
      });
    } finally {
      timer.end();
    }
  }

  async refresh(req, res) {
    try {
      const cookieVal =
        req.cookies.refreshToken && JSON.parse(req.cookies.refreshToken);
      if (!cookieVal) {
        return res.status(401).json({
          success: false,
          message: "No Token Found",
        });
      }

      // console.log(cookieVal);

      console.log(cookieVal);
      const { refreshToken, role } = cookieVal;

      // if (!refreshToken) {
      //   return res.status(401).json({
      //     success: false,
      //     message: "Refresh token not found",
      //   });
      // }

      // this.logger.debug("REFRESHH TOKEN", { refreshToken})

      // this.logger.debug('Refresh token attempt', { hasToken: !!refreshToken });

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: "Refresh token required",
        });
      }

      // Hash the incoming refresh token
      const hashedRefresh = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      // Find token in database
      const userTokenRecord =
        await this.userTokenModel.findByRefresh(hashedRefresh);

      if (!userTokenRecord) {
        this.logger.warn("Invalid refresh token");
        return res.status(401).json({
          success: false,
          message: "Invalid refresh token",
        });
      }

      // Check if refresh token is expired
      if (new Date(userTokenRecord.expires_at) < new Date()) {
        await this.userTokenModel.invalidate(userTokenRecord.token_id);
        // this.logger.warn('Refresh token expired', { token_id: userTokenRecord.token_id });
        return res.status(401).json({
          success: false,
          message: "Refresh token expired",
        });
      }

      // Generate new access token
      const newAccessToken = generateAccessToken(
        userTokenRecord.account_id,
        role,
      );

      const newRefreshToken = generateRefreshToken();

      const newHashedRefresh = crypto
        .createHash("sha256")
        .update(newRefreshToken)
        .digest("hex");

      // Update user status
      await this.user.updateUserStatus(userTokenRecord.account_id, "online");

      await this.userTokenModel.update(
        userTokenRecord?.account_id,
        newHashedRefresh,
      );

      // Set new access token cookie
      res.cookie("accessToken", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Strict",
        maxAge: 15 * 60 * 1000,
      });

      res.cookie(
        "refreshToken",
        JSON.stringify({
          refreshToken: newRefreshToken,
          role: role,
        }),

        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "None" : "Strict",
          maxAge: 30 * 24 * 60 * 60 * 1000,
        },
      );

      // this.logger.debug('Token refreshed', { account_id: userTokenRecord.account_id });

      res.json({
        success: true,
        message: "Token refreshed successfully",
      });
    } catch (err) {
      this.logger.error("Refresh error", { error: err.message });
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }

  async logout(req, res) {
    try {
      // const account_id = req.locals.account_id;
      const { user_id } = req.body || {};
      const token = req.cookies.accessToken;

      let payload;
      try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
        // this.logger.debug('Token verified', { userId: payload.userId, role: payload.role });
      } catch (err) {
        this.logger.warn("Invalid token", { error: err.message });
        throw err;
        // return res.status(401).json({
        //   success: false,
        //   message: 'Invalid or expired token'
        // });
      }

      const account_id = payload.userId;

      if (account_id !== user_id)
        res.json({ success: false, message: "Unknown User!" });

      if (account_id) {
        // Invalidate all tokens for user
        await this.userTokenModel.invalidateByUserId(account_id);

        // Update status to offline
        await this.user.updateUserStatus(account_id, "offline");

        this.logger.debug("logout", {
          success: true,
          ip: req.ip,
          account_id,
        });
      }

      // Clear cookies
      res.clearCookie("accessToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Strict",
      });

      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Strict",
      });

      res.json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (err) {
      this.logger.error("Logout failed", { error: err.message });
      res.status(500).json({
        success: false,
        message: "Logout failed.",
      });
    }
  }

  async protectedRoute(req, res) {
    try {
      const authHeader = req.headers["authorization"];

      if (!authHeader) {
        return res.status(401).json({
          success: false,
          message: "No authorization header",
        });
      }

      const token = authHeader.split(" ")[1];

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "No token provided",
        });
      }

      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        // this.logger.debug('Protected route accessed', {
        //   userId: payload.userId,
        //   endpoint: req.originalUrl
        // });

        res.json({
          success: true,
          message: `Hello user ${payload.userId}`,
          userId: payload.userId,
          role: payload.role,
        });
      } catch (err) {
        this.logger.warn("Invalid token in protected route", {
          error: err.message,
        });
        res.status(403).json({
          success: false,
          message: "Invalid or expired access token",
        });
      }
    } catch (err) {
      this.logger.error("Protected route error", { error: err.message });
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }

  async register(req, res) {
    const timer = this.logger.startTimer("register");

    try {
      const { email, password } = req.body;

      this.logger.info("Registration attempt", { email, ip: req.ip });

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required",
        });
      }

      // 1. Check if email is registered in student/professor tables
      const emailCheck = await this.user.findByEmail(email);
      if (!emailCheck) {
        return res.status(400).json({
          success: false,
          message: "Email not registered as student or professor",
        });
      }

      // 2. Validate Gmail requirement
      const emailValidation = Validator.validateEmailWithFeedback(email);
      if (!emailValidation.valid) {
        return res.status(400).json({
          success: false,
          message: emailValidation.message,
        });
      }

      // 3. Validate password
      if (!Validator.validatePassword(password)) {
        return res.status(400).json({
          success: false,
          message:
            "Password must be at least 8 characters with uppercase, lowercase, number, and special character",
        });
      }

      // 4. Create user account
      const result = await this.user.create(email, password);
      const accountId = result.insertId;

      // 5. Sync user to Supabase
      // await hybridDatabase.syncUserToSupabase(accountId.toString());

      // 6. Generate tokens
      const accessToken = generateAccessToken(accountId, emailCheck.role);
      const refreshToken = crypto.randomBytes(40).toString("hex");
      const hashedRefresh = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      // 7. Store refresh token
      await this.userTokenModel.create(accountId, hashedRefresh);

      // 8. Set cookies
      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Strict",
        //sameSite: "None",
        maxAge: 15 * 60 * 1000,
      });

      res.cookie(
        "refreshToken",
        JSON.stringify({
          refreshToken,
          role: emailCheck.role,
        }),
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "None" : "Strict",
          maxAge: 30 * 24 * 60 * 60 * 1000,
        },
      );

      this.logger.userActivity(accountId, "register", {
        success: true,
        ip: req.ip,
        role: emailCheck.role,
        userAgent: req.headers["user-agent"],
      });

      res.status(201).json({
        success: true,
        message: "Registration successful",
        data: {
          account_id: accountId,
          email: email,
          role: emailCheck.role,
        },
      });
    } catch (error) {
      this.logger.logError(error, {
        operation: "register",
        email: req.body?.email,
        ip: req.ip,
      });

      // Handle duplicate email error
      if (error.code === "ER_DUP_ENTRY") {
        return res.status(400).json({
          success: false,
          message: "Email already registered",
        });
      }

      res.status(400).json({
        success: false,
        message: error.message || "Registration failed",
      });
    } finally {
      timer.end();
    }
  }
}

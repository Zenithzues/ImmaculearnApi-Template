// import jwt from "jsonwebtoken";
// import User from "../../models/user.js";

import AdminModel from "../../models/MySQL/AdminModel.js";
import { UserToken } from "../../models/MySQL/UserToken.js";
import { Logger } from "../../utils/Logger.js";
import { generateAdminAccessToken } from "../../utils/tokens.js";

/**
 * Optional
 */
class AdminController {
  constructor() {
    // this.user = new User();
    this.admin = new AdminModel();
    this.userTokenModel = new UserToken();
    this.logger = new Logger("AdminController");
  }

  async create(req, res) {
    const { email, password, first_name, last_name } = req.body || {};

    try {
      // 1️⃣ Validate base fields
      if (!email || !password || first_name || last_name) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        });
      }

      return res.status(201).json({
        success: true,
        data: {
          admin_id: adminId,
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

  async login(req, res) {
    try {
      const { email, password } = req.body || {};

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password required",
        });
      }

      const admin = await this.admin.verify(email, password);

      if (!admin?.admin_id) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      const admin_id = admin.admin_id;

      const adminAccessToken = generateAdminAccessToken(admin_id);
      const refreshToken = generateRefreshToken();

      const hashedRefresh = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      const existing = await this.userTokenModel.findByAdminId(admin_id);

      if (existing) {
        await this.userTokenModel.adminUpdate(admin_id, hashedRefresh);
      } else {
        await this.userTokenModel.adminCreate(admin_id, hashedRefresh);
      }

      // const tempToken = jwtService.sign({ id: userId, email }, "15m");

      res.cookie("accessToken", adminAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 15 * 60 * 1000,
      });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        success: true,
        message: "Welcome Back Admin!",
      });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({
        success: false,
        message: err.toString(),
      });
    }
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

      const admin = await this.admin.findByAdminId(payload.adminId);

      if (!admin) {
        this.logger.warn("User not found for profile", {
          adminId: payload.adminId,
        });
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      const profileData = {
        id: admin[0].account_id,
        email: admin[0].email,
        name: admin[0].admin_fullname,
        role: "Admin",
      };

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
      const { refreshToken, role } = cookieVal;

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
      const newAccessToken = generateAdminAccessToken(userTokenRecord.admin_id);

      // Set new access token cookie
      res.cookie("accessToken", newAccessToken, {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "Strict",
        //sameSite: "None",
        //sameSite: "None",
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

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

  async start_academic_term(req, res) {
    try {
      const userInfo = await this.admin.get(res.locals.account_id);

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
}

export default AdminController;

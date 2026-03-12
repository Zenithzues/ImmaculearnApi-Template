import jwtService from "../../services/jwtService.js";
// import User from "../../models/user.js";
import crypto from "crypto";

import AdminModel from "../../models/MySQL/AdminModel.js";
import { UserToken } from "../../models/MySQL/UserToken.js";
import { Logger } from "../../utils/Logger.js";
import {
  generateAdminAccessToken,
  generateRefreshToken,
} from "../../utils/tokens.js";

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

      const user = await this.admin.verify(email, password);

      if (!user?.admin_id) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      const adminId = user.admin_id;

      const accessToken = generateAdminAccessToken(adminId);
      const refreshToken = generateRefreshToken();

      const hashedRefresh = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      const existing = await this.userTokenModel.findByAdminId(adminId);

      if (existing) {
        await this.userTokenModel.adminUpdate(adminId, hashedRefresh);
      } else {
        await this.userTokenModel.adminCreate(adminId, hashedRefresh);
      }

      const tempToken = jwtService.sign({ id: adminId, email }, "15m");

      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Strict",
        maxAge: 15 * 60 * 1000,
      });

      res.cookie(
        "refreshToken",
        JSON.stringify({ refreshToken: refreshToken, role: "Admin" }),
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "None" : "Strict",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        },
      );

      return res.status(200).json({
        success: true,
        message: "Welcome Back Admin!",
        accessToken: accessToken,
        role: "Admin",
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
        payload = jwtService.verify(token, process.env.JWT_SECRET);
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
        id: admin.admin_id,
        email: admin.admin_email,
        name: admin.admin_fullname,
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

  async logout(req, res) {
    try {
      const token = req.cookies.accessToken;

      let payload;
      try {
        payload = jwtService.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        this.logger.warn("Invalid token", { error: err.message });
        return res.status(401).json({
          success: false,
          message: "Invalid or expired token",
        });
      }

      const admin_id = payload.adminId;

      if (admin_id) {
        // Invalidate all tokens for admin
        await this.userTokenModel.invalidateByUserId(admin_id);

        this.logger.debug("logout", {
          success: true,
          ip: req.ip,
          admin_id,
        });
      }

      // Clear cookies
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");

      res.json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (err) {
      this.logger.error("Logout failed", { error: err.message });
      res.status(500).json({
        success: false,
        message: "Logout failed",
      });
    }
  }

  async refresh(req, res) {
    try {
      let cookieVal = req.cookies.refreshToken;

      // Handle both JSON string and plain string formats
      if (cookieVal) {
        try {
          cookieVal = JSON.parse(cookieVal);
        } catch (e) {
          // If parsing fails, treat as plain string with no role
          cookieVal = { refreshToken: cookieVal, role: null };
        }
      }

      if (!cookieVal) {
        return res.status(401).json({
          success: false,
          message: "No Token Found",
        });
      }

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
        return res.status(401).json({
          success: false,
          message: "Refresh token expired",
        });
      }

      // Generate new access token
      const newAccessToken = generateAdminAccessToken(userTokenRecord.admin_id);

      // Generate new refresh token
      const newRefreshToken = generateRefreshToken();
      const newHashedRefresh = crypto
        .createHash("sha256")
        .update(newRefreshToken)
        .digest("hex");

      // Update refresh token in database
      await this.userTokenModel.adminUpdate(
        userTokenRecord.admin_id,
        newHashedRefresh,
      );

      // Set new access token cookie
      res.cookie("accessToken", newAccessToken, {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Strict",
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      // Set new refresh token cookie as JSON
      res.cookie(
        "refreshToken",
        JSON.stringify({ refreshToken: newRefreshToken, role: "Admin" }),
        {
          secure: process.env.NODE_ENV === "production",
          httpOnly: true,
          sameSite: process.env.NODE_ENV === "production" ? "None" : "Strict",
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        },
      );

      res.json({
        success: true,
        message: "Token refreshed successfully",
        accessToken: newAccessToken,
      });
    } catch (err) {
      this.logger.error("Refresh error", { error: err.message });
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }

  async get_all_academic(req, res) {
    try {
      const admin_id = res.locals.admin_id || 1;

      if (!admin_id)
        return res
          .status(401)
          .json({ success: false, message: "UnAuthenticated Admin." });

      const userInfo = await this.admin.findByAdminId(admin_id);

      if (!userInfo)
        return res
          .status(404)
          .json({ success: false, message: "Admin not found." });

      const result = await this.admin.getAllAcademic();

      res.json({
        success: true,
        message: "Successfully get all academic",
        data: result,
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
  async create_academic(req, res) {
    try {
      const admin_id = res.locals.admin_id || 1;

      if (!admin_id)
        return res
          .status(401)
          .json({ success: false, message: "UnAuthenticated Admin." });

      const { academic_period, academic_semester, academic_year } =
        req.body || {};

      if (!academic_period || !academic_semester || !academic_year)
        return res
          .status(400)
          .json({ success: false, message: "Invalid Request." });

      const userInfo = await this.admin.findByAdminId(admin_id);

      if (!userInfo)
        return res
          .status(404)
          .json({ success: false, message: "Admin not found." });

      const academic = await this.admin.getLatestAcademicTerm();

      if (academic && academic?.academic_status === "active")
        return res.status(400).json({
          success: false,
          message:
            "Academic Period is On-going, Close the Existing Period first.",
        });

      const result = await this.admin.createAcademic(
        admin_id,
        academic_period,
        academic_semester,
        academic_year,
      );

      if (!result)
        return res
          .status(400)
          .json({ success: false, messgae: "Invalid Request" });

      res.json({
        success: true,
        message: "Successfully Creating Academic",
      });
      res.end();
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          message: "Academic already exists",
          field: "acad_term_name, semester, academic_year",
        });
      }
      res.json({
        success: false,
        message: err.toString(),
      });
    }
  }

  async update_academic(req, res) {
    try {
      const admin_id = res.locals.admin_id || 1;

      if (!admin_id) {
        return res.status(401).json({
          success: false,
          message: "UnAuthenticated Admin.",
        });
      }

      const {
        academic_id,
        academic_status = null,
        academic_period = null,
        academic_semester = null,
        academic_year = null,
      } = req.body || {};

      console.log(req.body);

      // acad_term_id MUST be provided
      if (!academic_id) {
        return res.status(400).json({
          success: false,
          message: "Academic ID is required.",
        });
      }

      // At least one field to update must be provided
      if (
        academic_status === null &&
        academic_period === null &&
        academic_semester === null &&
        academic_year === null
      ) {
        return res.status(400).json({
          success: false,
          message: "No fields provided to update.",
        });
      }

      const userInfo = await this.admin.findByAdminId(admin_id);

      if (!userInfo) {
        return res.status(404).json({
          success: false,
          message: "Admin not found.",
        });
      }

      /**
       * Business rule:
       * Only block updates when trying to CREATE / ACTIVATE
       * a new academic period while one is active
       */
      const academic = await this.admin.getLatestAcademicTerm();

      console.log(academic);

      if (
        academic &&
        academic.academic_status === "active" &&
        academic_status === "active"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "An academic period is currently active. Close it before activating another.",
        });
      }

      const result = await this.admin.updateAcademic(
        admin_id,
        academic_id,
        academic_period,
        academic_semester,
        academic_year,
        academic_status,
      );

      if (!result) {
        return res.status(400).json({
          success: false,
          message: "Failed to update academic term.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Academic term updated successfully.",
      });
    } catch (err) {
      this.logger?.error("Update academic error", err);

      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          success: false,
          message:
            "Invalid Request, Check for duplicate Academic Period, Academic Semester, and Academic Year.",
        });
      }
      return res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
    }
  }

  async close_academic(req, res) {
    try {
      const admin_id = res.locals.admin_id || 1;

      if (!admin_id)
        return res
          .status(401)
          .json({ success: false, message: "UnAuthenticated Admin." });

      const { acad_term_id } = req.body || {};
      const userInfo = await this.admin.findByAdminId(admin_id);

      if (!userInfo)
        return res
          .status(404)
          .json({ success: false, message: "Admin not found." });

      const academic = await this.admin.getLatestAcademicTerm();

      if (academic && academic?.academic_status === "active")
        return res.status(400).json({
          success: false,
          message:
            "Academic Period is On-going, Close the Existing Period first.",
        });

      const result = await this.admin.closeAcademic(admin_id, acad_term_id);

      if (!result)
        return res
          .status(400)
          .json({ success: false, messgae: "Invalid Request" });

      res.json({
        success: true,
        message: "Successfully Creating Academic",
      });
      res.end();
    } catch (err) {
      res.json({
        success: false,
        message: err.toString(),
      });
    }
  }
}

export default AdminController;

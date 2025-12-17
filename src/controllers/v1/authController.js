import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { generateAccessToken, generateRefreshToken } from '../../utils/tokens.js';
import { UserToken } from '../../models/userToken.js';

export class AuthController {
  constructor() {
    this.userTokenModel = new UserToken(); // instance of UserToken
  }

  // Login method
  async login(req, res) {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "User ID required" });

    const accessToken = generateAccessToken(userId);
    const refreshToken = generateRefreshToken();
    const hashedRefresh = crypto.createHash("sha256").update(refreshToken).digest("hex");

    const existing = await this.userTokenModel.findByUserId(userId);

    if (existing) {
        // Update existing token record
        await this.userTokenModel.update(userId, hashedRefresh);
    } else {
        // Create a new token record
        await this.userTokenModel.create(userId, refreshToken);
    }

    res.json({ accessToken, refreshToken });
    }


  // Refresh token method
  async refresh(req, res) {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });

    // console.log(refreshToken)

    const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const tokenRecord = await this.userTokenModel.findByHash(hash);

    console.log(tokenRecord)

    if (!tokenRecord) return res.status(403).json({ message: 'Invalid refresh token' });
    if (new Date(tokenRecord.expiresAt) < new Date()) {
      await this.userTokenModel.invalidate(tokenRecord.token_id);
      return res.status(403).json({ message: 'Refresh token expired' });
    }

    // Token rotation: invalidate old token
    // await this.userTokenModel.invalidate(tokenRecord.token_id);

    // Generate new tokens
    const newAccessToken = generateAccessToken(tokenRecord.userId);
    const newRefreshToken = generateRefreshToken();
    // await this.userTokenModel.create(tokenRecord.userId, newRefreshToken);
    await this.userTokenModel.update(tokenRecord.userId, newRefreshToken)

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  }

  // Protected route example
  protectedRoute(req, res) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.sendStatus(401);

    const token = authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      res.json({ message: `Hello user ${payload.userId}` });
    } catch {
      res.status(403).json({ message: 'Invalid or expired access token' });
    }
  }
}

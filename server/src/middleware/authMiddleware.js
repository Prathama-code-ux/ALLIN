import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    // 1. Get token from request headers
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Not authorized. Token missing."
      });
    }

    // 2. Extract token
    const token = authHeader.split(" ")[1];

    // 3. Verify token with fallback secret
    const jwtSecret = process.env.JWT_SECRET || "allin_default_super_secret_jwt_key_2026";
    const decoded = jwt.verify(token, jwtSecret);

    // 4. Find user in database
    const user = await User.findById(decoded.userId).select("-passwordHash");

    if (!user) {
      return res.status(401).json({
        message: "User no longer exists."
      });
    }

    // 5. Attach user to request
    req.user = user;

    // 6. Allow request to continue
    next();

  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token."
    });
  }
};

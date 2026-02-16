const jwt = require("jsonwebtoken");
const { User } = require("../models");

const protect = async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "JWT secret is not configured" });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized, token missing" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Not authorized, user not found" });
    }

    if (user.isPaused) {
      return res.status(403).json({ message: "Account is paused. Contact admin." });
    }

    req.user = user;
    req.auth = {
      tokenUserId: decoded.id,
      tokenRole: decoded.role,
      tokenPriority: decoded.priority,
    };
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Not authorized, token expired" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Not authorized, token invalid" });
    }
    return res.status(401).json({ message: "Not authorized" });
  }
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden: access denied" });
    }

    return next();
  };
};

module.exports = {
  protect,
  authorize,
};

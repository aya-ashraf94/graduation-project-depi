// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const db = require('../db');
const { users } = require('../db/schema');
const { eq } = require('drizzle-orm');

const authMiddleware = async (req, res, next) => {
    let token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        token = req.cookies?.nafa3ni_token;
    }

    if (!token) {
        return res.status(401).json({ message: "No token, authorization denied" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Lookup user in the database to verify if they exist and are not suspended
        const [user] = await db.select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          avatar: users.avatar,
          isSuspended: users.isSuspended,
          isVerified: users.isVerified,
          balance: users.balance,
          phoneNumber: users.phoneNumber,
          governorate: users.governorate,
          city: users.city,
          district: users.district,
          tierId: users.tierId,
          tierExpiresAt: users.tierExpiresAt,
          trustBadge: users.trustBadge,
          totalSales: users.totalSales,
          totalPurchases: users.totalPurchases,
          successRate: users.successRate,
        }).from(users).where(eq(users.id, decoded.id)).limit(1);
        if (!user) {
            return res.status(401).json({ message: "Token is valid, but user no longer exists" });
        }

        if (user.isSuspended) {
            return res.status(403).json({ message: "Your account is suspended. Please contact administration." });
        }

        req.user = user; // Store full user model on req.user so controllers don't have to fetch again
        next();
    } catch (err) {
        console.error("JWT Verification Error:", err.message);
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: "Token has expired, please log in again", code: "TOKEN_EXPIRED" });
        }
        res.status(401).json({ message: "Token is not valid" });
    }
};

module.exports = authMiddleware;
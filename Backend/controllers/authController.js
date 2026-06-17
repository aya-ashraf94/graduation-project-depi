const db = require("../db");
const { users, notifications } = require("../db/schema");
const { eq, and, gt, sql } = require("drizzle-orm");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const cloudinary = require("../config/cloudinary");
const { updateUserStats } = require("../utils/userStats");

const uploadBase64ToCloudinary = async (base64Str) => {
  if (!base64Str) return null;
  if (base64Str.startsWith("http")) return base64Str;
  const result = await cloudinary.uploader.upload(base64Str, {
    folder: "nafa3ni-avatars",
  });
  return result.secure_url;
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please fill all fields" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existingUsers = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [user] = await db.insert(users).values({
      name,
      email,
      password: hashedPassword,
    }).returning();

    const { password: _, ...userObj } = user;

    try {
      await db.insert(notifications).values({
        userId: user.id,
        type: "system",
        title: "Welcome to Nafa3ni! 🎉",
        body: "Complete your profile to start buying and selling on campus",
        linkedRoute: "/profile/me?edit=true",
        isRead: false,
      });
    } catch (notifError) {
      console.error("Failed to create welcome notification:", notifError);
    }

    res.status(201).json({
      message: "User Registered Successfully",
      user: userObj,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please fill all fields" });
    }

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (user) {
      await updateUserStats(user.id);
    }

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (user.isSuspended) {
      return res.status(403).json({
        message: "Your account has been suspended. Please contact support.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const { password: _, ...userObj } = user;

    res.json({
      message: "Login Success",
      token,
      user: userObj,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;
    await updateUserStats(userId);
    const [user] = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isVerified: users.isVerified,
      isSuspended: users.isSuspended,
      avatar: users.avatar,
      bio: users.bio,
      phoneNumber: users.phoneNumber,
      location: users.location,
      tags: users.tags,
      rating: users.rating,
      totalSales: users.totalSales,
      totalPurchases: users.totalPurchases,
      successRate: users.successRate,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error getting user by ID:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.params.id;

    if (req.user.id !== userId) {
      return res.status(403).json({ message: "Not authorized to update this profile" });
    }

    const { firstName, lastName, email, avatar, bio, location, tags, phoneNumber } = req.body;
    const updateData = {};

    if (firstName !== undefined || lastName !== undefined) {
      const [current] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
      const nameParts = (current?.name || '').split(' ');
      const currentFirst = nameParts[0] || '';
      const currentLast = nameParts.slice(1).join(' ') || '';
      const newFirst = firstName !== undefined ? firstName : currentFirst;
      const newLast = lastName !== undefined ? lastName : currentLast;
      updateData.name = `${newFirst} ${newLast}`.trim();
    }
    if (email !== undefined) updateData.email = email;
    if (avatar !== undefined) {
      updateData.avatar = await uploadBase64ToCloudinary(avatar);
    }
    if (bio !== undefined) updateData.bio = bio;
    if (location !== undefined) updateData.location = location;
    if (tags !== undefined) updateData.tags = tags;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;

    updateData.updatedAt = new Date();

    const [updatedUser] = await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isVerified: users.isVerified,
        isSuspended: users.isSuspended,
        avatar: users.avatar,
        bio: users.bio,
        phoneNumber: users.phoneNumber,
        location: users.location,
        tags: users.tags,
        rating: users.rating,
        totalSales: users.totalSales,
        totalPurchases: users.totalPurchases,
        successRate: users.successRate,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    await updateUserStats(userId);

    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Please provide your email" });
    }

    const successResponse = {
      message: "If a matching account exists, a secure password reset link has been sent to your email.",
    };

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      return res.json(successResponse);
    }

    const resetToken = crypto.randomBytes(20).toString("hex");
    await db.update(users).set({
      resetPasswordToken: resetToken,
      resetPasswordExpires: new Date(Date.now() + 3600000),
      updatedAt: new Date(),
    }).where(eq(users.id, user.id));

    console.log(`\n======================================================`);
    console.log(`📬 [DEV EMAIL SANDBOX]`);
    console.log(`TO: ${email}`);
    console.log(`SUBJECT: Reset Password Request`);
    console.log(`SECURE RESET LINK: http://localhost:4200/auth/login?token=${resetToken}`);
    console.log(`RESET TOKEN: ${resetToken}`);
    console.log(`======================================================\n`);

    res.json(successResponse);
  } catch (error) {
    console.error("Error in forgotPassword:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: "Please provide token and new password" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const [user] = await db.select().from(users).where(
      and(
        eq(users.resetPasswordToken, token),
        gt(users.resetPasswordExpires, new Date())
      )
    ).limit(1);

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired password reset token" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await db.update(users).set({
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      updatedAt: new Date(),
    }).where(eq(users.id, user.id));

    res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

const validateResetToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    const [user] = await db.select().from(users).where(
      and(
        eq(users.resetPasswordToken, token),
        gt(users.resetPasswordExpires, new Date())
      )
    ).limit(1);

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired password reset token" });
    }

    res.json({ valid: true });
  } catch (error) {
    console.error("Error in validateResetToken:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserById,
  updateProfile,
  forgotPassword,
  resetPassword,
  validateResetToken,
};

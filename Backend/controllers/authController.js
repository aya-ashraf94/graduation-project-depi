const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// REGISTER
const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // EMPTY FIELDS
        if (!name || !email || !password) {
            return res.status(400).json({
                message: "Please fill all fields",
            });
        }

        // EMAIL VALIDATION
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: "Invalid email format",
            });
        }

        // PASSWORD VALIDATION
        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must be at least 6 characters",
            });
        }

        // CHECK USER EXISTS
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({
                message: "Email already exists",
            });
        }

        // HASH PASSWORD
        const salt = await bcrypt.genSalt(10);

        const hashedPassword = await bcrypt.hash(password, salt);

        // CREATE USER
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
        });

        const userObj = user.toObject();
        delete userObj.password;

        res.status(201).json({
            message: "User Registered Successfully",
            user: userObj,
        });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({
            message: "Server Error",
        });
    }
};

// LOGIN
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // EMPTY FIELDS
        if (!email || !password) {
            return res.status(400).json({
                message: "Please fill all fields",
            });
        }

        // FIND USER
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({
                message: "Invalid email or password",
            });
        }

        // CHECK PASSWORD
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({
                message: "Invalid email or password",
            });
        }

        // CREATE TOKEN
        const token = jwt.sign(
            {
                id: user._id,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d",
            },
        );

        const userObj = user.toObject();
        delete userObj.password;

        res.json({
            message: "Login Success",
            token,
            user: userObj,
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            message: "Server Error",
        });
    }
};

const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }
        res.json(user);
    } catch (error) {
        console.error("Error getting user by ID:", error);
        res.status(500).json({
            message: "Server Error",
        });
    }
};

const updateProfile = async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Ensure user is updating their own profile
        if (req.user.id !== userId) {
            return res.status(403).json({ message: "Not authorized to update this profile" });
        }
        
        const { firstName, lastName, email, avatar, bio, location, tags } = req.body;
        
        const updateData = {};
        if (firstName !== undefined || lastName !== undefined) {
            const current = await User.findById(userId);
            const nameParts = (current.name || '').split(' ');
            const currentFirst = nameParts[0] || '';
            const currentLast = nameParts.slice(1).join(' ') || '';
            
            const newFirst = firstName !== undefined ? firstName : currentFirst;
            const newLast = lastName !== undefined ? lastName : currentLast;
            updateData.name = `${newFirst} ${newLast}`.trim();
        }
        if (email !== undefined) updateData.email = email;
        if (avatar !== undefined) updateData.avatar = avatar;
        if (bio !== undefined) updateData.bio = bio;
        if (location !== undefined) updateData.location = location;
        if (tags !== undefined) updateData.tags = tags;
        
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select("-password");
        
        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }
        
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
        const user = await User.findOne({ email });
        
        // Generic response to prevent username/email enumeration attacks
        const successResponse = {
            message: "If a matching account exists, a secure password reset link has been sent to your email."
        };
        
        if (!user) {
            return res.json(successResponse);
        }
        
        // Generate a random token
        const resetToken = crypto.randomBytes(20).toString("hex");
        
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour expiration
        await user.save();
        
        // Log securely on backend developer terminal console
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
        
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.status(400).json({ message: "Invalid or expired password reset token" });
        }
        
        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();
        
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
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });
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
    validateResetToken
};

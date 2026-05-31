const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });

const User = require("./models/User");
const connectDB = require("./config/db");

const seedAdmin = async () => {
    // Connect to database
    await connectDB();

    const email = process.argv[2] || "admin@nafa3ni.com";
    const password = process.argv[3] || "admin123456";

    try {
        // Check if user exists
        let user = await User.findOne({ email });

        if (user) {
            console.log(`User ${email} already exists. Promoting to admin...`);
            user.role = "admin";
            user.isVerified = true;
            await user.save();
            console.log(`✅ Success: User ${email} has been promoted to Admin.`);
        } else {
            console.log(`Creating a new admin user (${email})...`);
            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Create admin user
            user = await User.create({
                name: "System Admin",
                email,
                password: hashedPassword,
                role: "admin",
                isVerified: true
            });
            console.log(`✅ Success: Admin account created!`);
            console.log(`Email: ${email}`);
            console.log(`Password: ${password}`);
        }
    } catch (error) {
        console.error("❌ Error seeding admin:", error);
    } finally {
        // Disconnect DB
        mongoose.disconnect();
        process.exit(0);
    }
};

seedAdmin();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');
const Order = require('./models/Order');
const Review = require('./models/Review');
const Report = require('./models/Report');
const Notification = require('./models/Notification');
const Newsletter = require('./models/Newsletter');

async function exportData() {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/storeDB';
        console.log(`Connecting to MongoDB at: ${mongoUri}...`);
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB successfully.');

        // Fetch data from collections
        console.log('Fetching data from database...');
        const users = await User.find({});
        const categories = await Category.find({});
        const products = await Product.find({});
        const conversations = await Conversation.find({});
        const messages = await Message.find({});
        const orders = await Order.find({});
        const reviews = await Review.find({});
        const reports = await Report.find({});
        const notifications = await Notification.find({});
        const newsletters = await Newsletter.find({});

        console.log(`Status: Found ${users.length} users, ${categories.length} categories, ${products.length} products, ${conversations.length} conversations, ${messages.length} messages, ${orders.length} orders, ${reviews.length} reviews, ${reports.length} reports, ${notifications.length} notifications, ${newsletters.length} newsletters.`);

        // Ensure data directory exists
        const dataDir = path.join(__dirname, 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir);
            console.log('Created data/ directory.');
        }

        // Write data to files
        fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify(users, null, 2), 'utf8');
        fs.writeFileSync(path.join(dataDir, 'categories.json'), JSON.stringify(categories, null, 2), 'utf8');
        fs.writeFileSync(path.join(dataDir, 'products.json'), JSON.stringify(products, null, 2), 'utf8');
        fs.writeFileSync(path.join(dataDir, 'conversations.json'), JSON.stringify(conversations, null, 2), 'utf8');
        fs.writeFileSync(path.join(dataDir, 'messages.json'), JSON.stringify(messages, null, 2), 'utf8');
        fs.writeFileSync(path.join(dataDir, 'orders.json'), JSON.stringify(orders, null, 2), 'utf8');
        fs.writeFileSync(path.join(dataDir, 'reviews.json'), JSON.stringify(reviews, null, 2), 'utf8');
        fs.writeFileSync(path.join(dataDir, 'reports.json'), JSON.stringify(reports, null, 2), 'utf8');
        fs.writeFileSync(path.join(dataDir, 'notifications.json'), JSON.stringify(notifications, null, 2), 'utf8');
        fs.writeFileSync(path.join(dataDir, 'newsletters.json'), JSON.stringify(newsletters, null, 2), 'utf8');

        console.log('Export completed successfully! Data saved to Backend/data/');
    } catch (error) {
        console.error('Error exporting database data:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

exportData();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');

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

        console.log(`Status: Found ${users.length} users, ${categories.length} categories, and ${products.length} products.`);

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

        console.log('Export completed successfully! Data saved to Backend/data/');
    } catch (error) {
        console.error('Error exporting database data:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

exportData();

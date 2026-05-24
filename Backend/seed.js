const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');

async function seedData() {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/storeDB';
        console.log(`Connecting to MongoDB at: ${mongoUri}...`);
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB successfully.');

        const dataDir = path.join(__dirname, 'data');

        // Check if categories.json exists, since categories are critical
        const categoriesPath = path.join(dataDir, 'categories.json');
        if (!fs.existsSync(categoriesPath)) {
            console.error(`Error: Seed data file categories.json not found at ${categoriesPath}.`);
            console.error('Please run the export script first to generate this file.');
            process.exit(1);
        }

        // Drop existing collections to avoid duplicates
        console.log('Clearing existing collections (User, Category, Product)...');
        await Category.deleteMany({});
        await User.deleteMany({});
        await Product.deleteMany({});
        console.log('Collections cleared successfully.');

        // Load categories
        const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
        if (categories && categories.length > 0) {
            console.log(`Importing ${categories.length} categories...`);
            await Category.insertMany(categories);
            console.log('Categories imported successfully.');
        } else {
            console.log('No categories found to import.');
        }

        // Load users (if file exists)
        const usersPath = path.join(dataDir, 'users.json');
        if (fs.existsSync(usersPath)) {
            const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
            if (users && users.length > 0) {
                console.log(`Importing ${users.length} users...`);
                await User.insertMany(users);
                console.log('Users imported successfully.');
            } else {
                console.log('No users found in users.json.');
            }
        } else {
            console.log('No users.json file found. Skipping user import.');
        }

        // Load products (if file exists)
        const productsPath = path.join(dataDir, 'products.json');
        if (fs.existsSync(productsPath)) {
            const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
            if (products && products.length > 0) {
                console.log(`Importing ${products.length} products...`);
                await Product.insertMany(products);
                console.log('Products imported successfully.');
            } else {
                console.log('No products found in products.json.');
            }
        } else {
            console.log('No products.json file found. Skipping product import.');
        }

        console.log('Database seeding and import completed successfully!');
    } catch (error) {
        console.error('Error seeding/importing database data:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

seedData();

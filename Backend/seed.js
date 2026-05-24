const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');

async function upsertMany(Model, records) {
    if (!records || records.length === 0) return { added: 0, updated: 0 };

    const operations = records.map(record => ({
        updateOne: {
            filter: { _id: record._id },
            update: { $set: record },
            upsert: true
        }
    }));

    const result = await Model.bulkWrite(operations);
    return {
        added: result.upsertedCount,
        updated: result.modifiedCount
    };
}

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

        // Load categories
        const categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
        if (categories && categories.length > 0) {
            console.log(`Importing/Updating ${categories.length} categories...`);
            const res = await upsertMany(Category, categories);
            console.log(`Categories: Added ${res.added}, Updated ${res.updated}.`);
        } else {
            console.log('No categories found to import.');
        }

        // Load users (if file exists)
        const usersPath = path.join(dataDir, 'users.json');
        if (fs.existsSync(usersPath)) {
            const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
            if (users && users.length > 0) {
                console.log(`Importing/Updating ${users.length} users...`);
                const res = await upsertMany(User, users);
                console.log(`Users: Added ${res.added}, Updated ${res.updated}.`);
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
                console.log(`Importing/Updating ${products.length} products...`);
                const res = await upsertMany(Product, products);
                console.log(`Products: Added ${res.added}, Updated ${res.updated}.`);
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

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

async function seedCollection(dataDir, Model, filename, preProcessor = null) {
    const filepath = path.join(dataDir, filename);
    if (fs.existsSync(filepath)) {
        let records = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        if (records && records.length > 0) {
            if (preProcessor) {
                records = await preProcessor(records);
            }
            console.log(`Importing/Updating ${records.length} documents for ${Model.modelName}...`);
            const res = await upsertMany(Model, records);
            console.log(`${Model.modelName}: Added ${res.added}, Updated ${res.updated}.`);
        } else {
            console.log(`No records found in ${filename}.`);
        }
    } else {
        console.log(`Seed file ${filename} not found. Skipping ${Model.modelName} import.`);
    }
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

        // Seed categories (critical)
        await seedCollection(dataDir, Category, 'categories.json');

        // Seed users (with password hashing preprocessor)
        const userPreprocessor = async (users) => {
            console.log('Resetting all seeded user passwords to default: 123456');
            const bcrypt = require('bcryptjs');
            const salt = await bcrypt.genSalt(10);
            const defaultHash = await bcrypt.hash('123456', salt);
            users.forEach(user => {
                user.password = defaultHash;
            });
            return users;
        };
        await seedCollection(dataDir, User, 'users.json', userPreprocessor);

        // Seed other collections
        await seedCollection(dataDir, Product, 'products.json');
        await seedCollection(dataDir, Conversation, 'conversations.json');
        await seedCollection(dataDir, Message, 'messages.json');
        await seedCollection(dataDir, Order, 'orders.json');
        await seedCollection(dataDir, Review, 'reviews.json');
        await seedCollection(dataDir, Report, 'reports.json');
        await seedCollection(dataDir, Notification, 'notifications.json');
        await seedCollection(dataDir, Newsletter, 'newsletters.json');

        console.log('Database seeding and import completed successfully!');
    } catch (error) {
        console.error('Error seeding/importing database data:', error);
    } finally {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/storeDB');
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

seedData();

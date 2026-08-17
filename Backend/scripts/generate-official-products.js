const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
    try {
        console.log('Connecting to Neon PostgreSQL...');
        await pool.connect();
        console.log('Connected successfully.');

        // 1. Create or Find the Nafa3ni Store user
        const { rows: existingUsers } = await pool.query("SELECT * FROM users WHERE email = $1", ['store@nafa3ni.com']);
        let storeUser = existingUsers[0];
        if (!storeUser) {
            console.log('Creating Nafa3ni Store Admin User...');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('nafa3nistoreadmin99', salt);
            const { rows: newUser } = await pool.query(
                `INSERT INTO users (name, email, password, role, is_verified, location, phone_number)
                 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
                ['Nafa3ni Store', 'store@nafa3ni.com', hashedPassword, 'admin', true, 'Port Said, Egypt', '01012345678']
            );
            storeUser = newUser[0];
            console.log('Nafa3ni Store Admin User created successfully.');
        } else {
            console.log('Nafa3ni Store Admin User already exists. Ensuring location and phone number are set...');
            await pool.query(
                `UPDATE users SET location = $1, phone_number = $2 WHERE id = $3`,
                ['Port Said, Egypt', '01012345678', storeUser.id]
            );
        }

        // 2. Fetch categories to link IDs
        const { rows: dbCategories } = await pool.query('SELECT * FROM categories');
        if (dbCategories.length === 0) {
            console.error('Error: No categories found in the database. Please seed categories first.');
            process.exit(1);
        }

        // Helper map to quickly find categoryId by name
        const categoryMap = {};
        dbCategories.forEach(cat => {
            categoryMap[cat.name] = cat.id;
        });

        // 3. Clear existing official products (to avoid duplicates when running multiple times)
        console.log('Clearing old official products...');
        await pool.query('DELETE FROM products WHERE sold_by_nafa3ni = true');
        console.log('Cleared old official products.');

        // 4. Define product templates (4 per category)
        const officialProducts = [
            // === FURNITURE ===
            {
                title: 'Neo-Brutalist Premium Study Desk',
                description: 'A study desk designed for maximum utility. Heavy-duty construction with high contrast geometric edges, features cable routing, storage hooks, and a solid wood surface. Built to withstand late-night study sessions.',
                price: 1850,
                categoryName: 'Furniture',
                brand: 'NAFA3NI ARCHIVE',
                images: ['https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800'],
                location: 'Main Library',
                phoneNumber: '01012345678',
                dynamicAttributes: {
                    badge: 'SOLD BY NAFA3NI',
                    Condition: 'New',
                    conditionScore: 10,
                    type: 'Desk',
                    material: 'Wood',
                    color: 'Brown',
                    condition: 'New'
                }
            },
            {
                title: 'Ergonomic High-Back Office Chair',
                description: 'Professional-grade ergonomic mesh chair. Fully adjustable lumbar support, 3D armrests, and dynamic tilt mechanism. Perfect for study spaces and long hours of programming or designing.',
                price: 2400,
                categoryName: 'Furniture',
                brand: 'ERGOPRO',
                images: ['https://images.unsplash.com/photo-1505797149-43b0069ec26b?w=800'],
                location: 'Faculty of Engineering',
                phoneNumber: '01012345678',
                dynamicAttributes: {
                    badge: 'SOLD BY NAFA3NI',
                    Condition: 'New',
                    conditionScore: 10,
                    type: 'Office Furniture',
                    material: 'Metal',
                    color: 'Black',
                    condition: 'New'
                }
            },
            {
                title: 'Minimalist 5-Tier Wooden Bookshelf',
                description: 'A space-saving vertical bookshelf made from high-quality solid pine. Easily fits textbook binders, files, and decor. Sturdy structure with premium varnish finish.',
                price: 950,
                categoryName: 'Furniture',
                brand: 'PINEWOOD',
                images: ['https://images.unsplash.com/photo-1594620302200-9a762244a156?w=800'],
                location: 'Main Library',
                phoneNumber: '01012345678',
                dynamicAttributes: {
                    badge: 'SOLD BY NAFA3NI',
                    Condition: 'New',
                    conditionScore: 10,
                    type: 'Bookshelf',
                    material: 'Wood',
                    color: 'White',
                    condition: 'New'
                }
            },
            {
                title: 'Cozy Charcoal Fabric Lounger Sofa',
                description: 'Compact 2-seater sofa upholstered in ultra-durable, spill-resistant fabric. Ergonomic design perfect for dorm lounge areas or quiet reading corners.',
                price: 3200,
                categoryName: 'Furniture',
                brand: 'NAFA3NI COZY',
                images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800'],
                location: 'user Dorms Zone A',
                phoneNumber: '01012345678',
                dynamicAttributes: {
                    badge: 'SOLD BY NAFA3NI',
                    Condition: 'New',
                    conditionScore: 10,
                    type: 'Sofa',
                    material: 'Fabric',
                    color: 'Grey',
                    condition: 'New'
                }
            },

            // === MOBILES ===
            {
                title: 'iPhone 15 Pro Max (Grade A Refurbished)',
                description: 'Official Nafa3ni Certified iPhone 15 Pro Max. 256GB storage, Natural Titanium. Battery health is at 98%, tested and verified by our technical team. Comes with 1-year store warranty and original charging cable.',
                price: 42000,
                categoryName: 'Mobiles',
                brand: 'Apple',
                images: ['https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800'],
                location: 'user Hub Center',
                phoneNumber: '01012345678',
                dynamicAttributes: {
                    badge: 'SOLD BY NAFA3NI',
                    Condition: 'New',
                    conditionScore: 9,
                    brand: 'Apple',
                    storage: '256GB',
                    color: 'Silver',
                    condition: 'New'
                }
            },
            {
                title: 'Samsung Galaxy S24 Ultra (Sealed)',
                description: 'Brand new, factory sealed Samsung Galaxy S24 Ultra 512GB in Titanium Gray. Official Egyptian warranty. Dynamic AMOLED 2X, Snapdragon 8 Gen 3, and integrated S-Pen.',
                price: 49500,
                categoryName: 'Mobiles',
                brand: 'Samsung',
                images: ['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800'],
                location: 'user Hub Center',
                phoneNumber: '01012345678',
                dynamicAttributes: {
                    badge: 'SOLD BY NAFA3NI',
                    Condition: 'New',
                    conditionScore: 10,
                    brand: 'Samsung',
                    storage: '512GB',
                    color: 'Black',
                    condition: 'New'
                }
            },
            {
                title: 'Google Pixel 8 Pro 128GB',
                description: 'Google Pixel 8 Pro in Porcelain white. Flawless condition, box opened only for verification. Outstanding camera capabilities and pure Android experience with Gemini integration.',
                price: 31000,
                categoryName: 'Mobiles',
                brand: 'Other',
                images: ['https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800'],
                location: 'user Hub Center',
                phoneNumber: '01012345678',
                dynamicAttributes: {
                    badge: 'SOLD BY NAFA3NI',
                    Condition: 'New',
                    conditionScore: 10,
                    brand: 'Other',
                    storage: '128GB',
                    color: 'White',
                    condition: 'New'
                }
            },
            {
                title: 'Xiaomi Redmi Note 13 Pro 256GB',
                description: 'Great mid-range option for users. 256GB storage, 8GB RAM, Midnight Black. 200MP camera and ultra-fast 67W charging. Factory sealed.',
                price: 14500,
                categoryName: 'Mobiles',
                brand: 'Redmi',
                images: ['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800'],
                location: 'Faculty of Computer Science',
                phoneNumber: '01012345678',
                dynamicAttributes: {
                    badge: 'SOLD BY NAFA3NI',
                    Condition: 'New',
                    conditionScore: 10,
                    brand: 'Redmi',
                    storage: '256GB',
                    color: 'Black',
                    condition: 'New'
                }
            },

            // === LAPTOPS ===
            {
                title: 'MacBook Air M2 13-inch (Space Gray)',
                description: 'Official stock Apple MacBook Air M2. 8GB Unified RAM, 256GB SSD. Lightweight, high battery life, perfect for lecture notes and software development. In original sealed retail packaging.',
                price: 46000,
                categoryName: 'Laptops',
                brand: 'Apple',
                images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800'],
                location: 'Faculty of Engineering',
                phoneNumber: '01012345678',
                dynamicAttributes: {
                    badge: 'SOLD BY NAFA3NI',
                    Condition: 'New',
                    conditionScore: 10,
                    brand: 'Apple',
                    ram: '8GB',
                    storage: '256GB SSD',
                    processor: 'Apple M2',
                    condition: 'New'
                }
            },
            {
                title: 'Dell XPS 13 Core i7 Premium Ultrabook',
                description: 'Dell XPS 13 (9315) featuring Intel Core i7 12th Gen, 16GB LPDDR5 RAM, 512GB PCIe SSD. Gorgeous InfinityEdge display. Elite lightweight device for academic research and productivity.',
                price: 38500,
                categoryName: 'Laptops',
                brand: 'Dell',
                images: ['https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800'],
                location: 'Faculty of Science',
                phoneNumber: '01012345678',
                dynamicAttributes: {
                    badge: 'SOLD BY NAFA3NI',
                    Condition: 'New',
                    conditionScore: 10,
                    brand: 'Dell',
                    ram: '16GB',
                    storage: '512GB SSD',
                    processor: 'Intel Core i7',
                    condition: 'New'
                }
            },
            {
                title: 'Lenovo ThinkPad E14 Gen 5 (Business Black)',
                description: 'Legendary durability. Intel Core i5 13th Gen, 16GB RAM, 512GB SSD. Spill-resistant keyboard, military-grade construction. The best companion for computer science and business majors.',
                price: 29000,
                categoryName: 'Laptops',
                brand: 'Lenovo',
                images: ['https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800'],
                location: 'Faculty of Computer Science',
                phoneNumber: '01012345678',
                dynamicAttributes: {
                    badge: 'SOLD BY NAFA3NI',
                    Condition: 'New',
                    conditionScore: 10,
                    brand: 'Lenovo',
                    ram: '16GB',
                    storage: '512GB SSD',
                    processor: 'Intel Core i5',
                    condition: 'New'
                }
            },
            {
                title: 'HP Victus 15 Gaming Laptop (RTX 4050)',
                description: 'Affordable high-performance gaming and graphics machine. Intel Core i5, 16GB DDR5 RAM, 512GB SSD, and NVIDIA GeForce RTX 4050 graphics card. 144Hz high refresh rate screen.',
                price: 36000,
                categoryName: 'Laptops',
                brand: 'HP',
                images: ['https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800'],
                location: 'Faculty of Fine Arts',
                phoneNumber: '01012345678',
                dynamicAttributes: {
                    badge: 'SOLD BY NAFA3NI',
                    Condition: 'New',
                    conditionScore: 10,
                    brand: 'HP',
                    ram: '16GB',
                    storage: '512GB SSD',
                    processor: 'Intel Core i5',
                    condition: 'New'
                }
            },

            // === CLOTHES ===
            {
                title: 'Nafa3ni Official Oversized Hoodie',
                description: 'High-quality university merchandise. Heavyweight 400GSM organic cotton fabric, features minimal front logo embroidery and soft fleece lining. Perfect comfort clothing for winter study sessions.',
                price: 850,
                categoryName: 'Clothes',
                brand: 'NAFA3NI MERCH',
                images: ['https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800'],
                location: 'user Hub Center',
                phoneNumber: '01012345678',
                dynamicAttributes: {
                    badge: 'SOLD BY NAFA3NI',
                    Condition: 'New',
                    conditionScore: 10,
                    type: 'Hoodie',
                    size: 'XL',
                    color: 'Black',
                    brand: 'Nafa3ni Merch',
                    condition: 'New'
                }
            },
            {
                title: 'Classic Denim Vintage Jacket',
                description: 'Timeless denim design. Made with 100% rigid cotton denim, standard trucker fit, featuring durable brass buttons. Stone washed for a vintage texture.',
                price: 720,
                categoryName: 'Clothes',
                brand: 'ARCHIVE CLASSICS',
                images: ['https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800'],
                location: 'user Hub Center',
                phoneNumber: '01012345678',
                dynamicAttributes: {
                    badge: 'SOLD BY NAFA3NI',
                    Condition: 'New',
                    conditionScore: 10,
                    type: 'Jacket',
                    size: 'L',
                    color: 'Blue',
                    brand: 'Archive Classics',
                    condition: 'New'
                }
            },
            {
                title: 'Premium Multi-Pocket Cargo Pants',
                description: 'Durable ripstop cotton cargo pants. 6 functional pockets, adjustable drawstring waist and ankles. Highly functional and stylish everyday wear.',
                price: 680,
                categoryName: 'Clothes',
                brand: 'STREETARCH',
                images: ['https://images.unsplash.com/photo-1517423568366-8b83523034fd?w=800'],
                location: 'user Hub Center',
                phoneNumber: '01012345678',
                dynamicAttributes: {
                    badge: 'SOLD BY NAFA3NI',
                    Condition: 'New',
                    conditionScore: 10,
                    type: 'Pants',
                    size: 'M',
                    color: 'Green',
                    brand: 'StreetArch',
                    condition: 'New'
                }
            },
            {
                title: 'University Athletics Premium Tee',
                description: 'Athletic crewneck t-shirt made of 100% breathable combed cotton. Double-stitched seams, regular fit, minimal athletic print.',
                price: 350,
                categoryName: 'Clothes',
                brand: 'NAFA3NI MERCH',
                images: ['https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800'],
                location: 'user Hub Center',
                phoneNumber: '01012345678',
                dynamicAttributes: {
                    badge: 'SOLD BY NAFA3NI',
                    Condition: 'New',
                    conditionScore: 10,
                    type: 'T-shirt',
                    size: 'S',
                    color: 'Grey',
                    brand: 'Nafa3ni Merch',
                    condition: 'New'
                }
            },

            // === ELECTRONICS ===
            {
                title: 'Sony WH-1000XM4 Noise Canceling Headphones',
                description: 'Industry-leading noise canceling over-ear headphones. Crystal clear audio, 30-hour battery life, touch controls, and multipoint Bluetooth connection. Ideal for blockout study sessions.',
                price: 11500,
                categoryName: 'Electronics',
                brand: 'Sony',
                images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'],
                location: 'Faculty of Computer Science',
                phoneNumber: '01012345678',
                dynamicAttributes: {
                    badge: 'SOLD BY NAFA3NI',
                    Condition: 'New',
                    conditionScore: 10,
                    type: 'Headphones',
                    brand: 'Sony',
                    condition: 'New'
                }
            },
            {
                title: 'Logitech MX Master 3S Wireless Mouse',
                description: 'The ultimate mouse for developers and creators. MagSpeed electromagnetic scroll wheel, 8K DPI tracking on any surface, silent clicks, and custom profiles for software tools.',
                price: 4200,
                categoryName: 'Electronics',
                brand: 'Other',
                images: ['https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800'],
                location: 'Faculty of Computer Science',
                phoneNumber: '01012345678',
                dynamicAttributes: {
                    badge: 'SOLD BY NAFA3NI',
                    Condition: 'New',
                    conditionScore: 10,
                    type: 'Other',
                    brand: 'Other',
                    condition: 'New'
                }
            },
            {
                title: 'Anker Prime 24000mAh Power Bank (140W)',
                description: 'Ultra-high capacity power bank with 140W multi-device fast charging. Features a smart digital display showing battery health, charging speed, and cycle counts. Can charge your laptop on the go.',
                price: 3800,
                categoryName: 'Electronics',
                brand: 'Other',
                images: ['https://images.unsplash.com/photo-1609592424085-f5596041a87e?w=800'],
                location: 'Faculty of Engineering',
                phoneNumber: '01012345678',
                dynamicAttributes: {
                    badge: 'SOLD BY NAFA3NI',
                    Condition: 'New',
                    conditionScore: 10,
                    type: 'Other',
                    brand: 'Other',
                    condition: 'New'
                }
            },
            {
                title: 'Sony Alpha 4K Action Sports Camera',
                description: 'High-speed action camera capable of recording 4K ultra-smooth video. Built-in stabilization, waterproof casing, and long battery life. Perfect for events and field work.',
                price: 18000,
                categoryName: 'Electronics',
                brand: 'Sony',
                images: ['https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800'],
                location: 'Faculty of Fine Arts',
                phoneNumber: '01012345678',
                dynamicAttributes: {
                    badge: 'SOLD BY NAFA3NI',
                    Condition: 'New',
                    conditionScore: 10,
                    type: 'Camera',
                    brand: 'Sony',
                    condition: 'New'
                }
            },

            // === HOME APPLIANCES ===
            {
                title: 'Retro Compact Mini Dorm Refrigerator',
                description: 'A stylish 90L mini fridge with separate freezer compartment. Ultra-quiet operation technology, energy star certified, adjustable glass shelves. Ideal for keeping snacks and drinks cold in your dorm room.',
                price: 6500,
                categoryName: 'Home Appliances',
                brand: 'Samsung',
                images: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800'],
                location: 'user Dorms Zone B',
                phoneNumber: '01012345678',
                dynamicAttributes: {
                    badge: 'SOLD BY NAFA3NI',
                    Condition: 'New',
                    conditionScore: 10,
                    type: 'Refrigerator',
                    brand: 'Samsung',
                    condition: 'New'
                }
            },
            {
                title: 'Digital Touch Solo Microwave (20L)',
                description: 'Compact 800W microwave oven with 6 preset cooking programs and child safety lock. Glass turntable, digital LED clock. Perfect for quick heating and cooking inside a user flat.',
                price: 3900,
                categoryName: 'Home Appliances',
                brand: 'Samsung',
                images: ['https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=800'],
                location: 'user Dorms Zone B',
                phoneNumber: '01012345678',
                dynamicAttributes: {
                    badge: 'SOLD BY NAFA3NI',
                    Condition: 'New',
                    conditionScore: 10,
                    type: 'Microwave',
                    brand: 'Samsung',
                    condition: 'New'
                }
            },
            {
                title: 'DeLonghi Retro Espresso Coffee Maker',
                description: 'Classic pump espresso and cappuccino maker with 15 bar pressure. Dual-option filter holder for ground coffee or pods. Steam wand froth system for barista-quality drinks in your kitchen.',
                price: 5200,
                categoryName: 'Home Appliances',
                brand: 'Other',
                images: ['https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800'],
                location: 'user Dorms Zone B',
                phoneNumber: '01012345678',
                dynamicAttributes: {
                    badge: 'SOLD BY NAFA3NI',
                    Condition: 'New',
                    conditionScore: 10,
                    type: 'Other',
                    brand: 'Other',
                    condition: 'New'
                }
            },
            {
                title: 'Ultrasonic Cool Mist Humidifier (4L)',
                description: 'Whisper-quiet humidifier with 4L water tank capacity. Adjustable mist output, automatic shut-off safety sensor, filterless design. Helps maintain healthy humidity levels in dry study spaces.',
                price: 1200,
                categoryName: 'Home Appliances',
                brand: 'Other',
                images: ['https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800'],
                location: 'user Dorms Zone A',
                phoneNumber: '01012345678',
                dynamicAttributes: {
                    badge: 'SOLD BY NAFA3NI',
                    Condition: 'New',
                    conditionScore: 10,
                    type: 'Other',
                    brand: 'Other',
                    condition: 'New'
                }
            },

            // === SPORTS & FITNESS ===
            {
                title: 'Premium Adjustable Steel Dumbbells (Pair)',
                description: 'Heavy duty selectorized dumbbells. Adjusts from 2kg to 24kg with a simple turn of a dial. Replaces 15 separate pairs of dumbbells, perfect space-saving gym gear for rooms.',
                price: 4900,
                categoryName: 'Sports & Fitness',
                brand: 'Pro-Gym',
                images: ['https://images.unsplash.com/photo-1638536532686-d610adfc8e5c?w=800'],
                location: 'user Gym Facility',
                phoneNumber: '01012345678',
                dynamicAttributes: {
                    badge: 'SOLD BY NAFA3NI',
                    Condition: 'New',
                    conditionScore: 10,
                    type: 'Dumbbells',
                    brand: 'Pro-Gym',
                    condition: 'New'
                }
            },
            {
                title: 'Foldable Magnetic Exercise Fitness Bike',
                description: 'Compact space-saving design folding exercise bike. 8 levels of smooth magnetic resistance adjustments, clear LCD console tracking distance, speed, time, and calories burned.',
                price: 3600,
                categoryName: 'Sports & Fitness',
                brand: 'Pro-Gym',
                images: ['https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800'],
                location: 'user Gym Facility',
                phoneNumber: '01012345678',
                dynamicAttributes: {
                    badge: 'SOLD BY NAFA3NI',
                    Condition: 'New',
                    conditionScore: 10,
                    type: 'Exercise Bike',
                    brand: 'Pro-Gym',
                    condition: 'New'
                }
            },
            {
                title: 'High-Density Non-Slip 8mm Yoga Mat',
                description: 'Premium eco-friendly TPE yoga mat. 8mm thick padding protects joints, dual-texture non-slip surface provides traction. Comes with a carrying strap for classes.',
                price: 450,
                categoryName: 'Sports & Fitness',
                brand: 'Nafa3ni Active',
                images: ['https://images.unsplash.com/photo-1592432678016-e910b452f9a2?w=800'],
                location: 'user Gym Facility',
                phoneNumber: '01012345678',
                dynamicAttributes: {
                    badge: 'SOLD BY NAFA3NI',
                    Condition: 'New',
                    conditionScore: 10,
                    type: 'Yoga Mat',
                    brand: 'Nafa3ni Active',
                    condition: 'New'
                }
            },
            {
                title: 'Urban Explorer Commuter Bicycle (21-Speed)',
                description: 'Sturdy steel-framed urban road/trail bicycle. 21-speed twist shifters, front suspension fork, dual disc brakes. Perfect for fast commuting around the university and city streets.',
                price: 7800,
                categoryName: 'Sports & Fitness',
                brand: 'Pro-Gym',
                images: ['https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800'],
                location: 'user Gym Facility',
                phoneNumber: '01012345678',
                dynamicAttributes: {
                    badge: 'SOLD BY NAFA3NI',
                    Condition: 'New',
                    conditionScore: 10,
                    type: 'Bicycle',
                    brand: 'Pro-Gym',
                    condition: 'New'
                }
            },

            // === OTHER ===
            {
                title: 'Premium Hardcover Drawing Sketchbook (A4)',
                description: 'Professional grade sketchpad. 120 sheets of 160GSM acid-free sketch paper, durable hardcover binding, flat opening layout. Designed for architecture and fine arts user drafting.',
                price: 280,
                categoryName: 'Other',
                brand: 'ARTSTUDIO',
                images: ['https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800'],
                location: 'Faculty of Fine Arts',
                phoneNumber: '01012345678',
                dynamicAttributes: {
                    badge: 'SOLD BY NAFA3NI',
                    Condition: 'New',
                    conditionScore: 10,
                    item_type: 'Sketchbook',
                    condition: 'New'
                }
            },
            {
                title: 'Dual-Tip Professional Art Markers (80 Colors)',
                description: 'Broad chisel and fine point sketch markers. 80 vibrant permanent colors, fast drying ink, includes portable fabric zipper bag. Excellent for designs, illustrations, and drafting layouts.',
                price: 650,
                categoryName: 'Other',
                brand: 'ARTSTUDIO',
                images: ['https://images.unsplash.com/photo-1519750711847-8162bd50cf16?w=800'],
                location: 'Faculty of Fine Arts',
                phoneNumber: '01012345678',
                dynamicAttributes: {
                    badge: 'SOLD BY NAFA3NI',
                    Condition: 'New',
                    conditionScore: 10,
                    item_type: 'Art Markers',
                    condition: 'New'
                }
            },
            {
                title: 'Architectural Drawing Draft Board (A2)',
                description: 'Portable architectural drawing board. Precision parallel motion rule, adjustable elevation angles, non-slip base grip. Perfect for drafting and engineering design users.',
                price: 1100,
                categoryName: 'Other',
                brand: 'DRAFTLINE',
                images: ['https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800'],
                location: 'Faculty of Engineering',
                phoneNumber: '01012345678',
                dynamicAttributes: {
                    badge: 'SOLD BY NAFA3NI',
                    Condition: 'New',
                    conditionScore: 10,
                    item_type: 'Draft Board',
                    condition: 'New'
                }
            },
            {
                title: 'Ergonomic Aluminum Adjustable Laptop Stand',
                description: 'Sleek geometric desktop stand for laptops up to 16". Made of high-quality aluminum alloy, 6 adjustable heights, fully foldable with rubber grips. Enhances posture and laptop airflow.',
                price: 340,
                categoryName: 'Other',
                brand: 'DRAFTLINE',
                images: ['https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800'],
                location: 'Faculty of Computer Science',
                phoneNumber: '01012345678',
                dynamicAttributes: {
                    badge: 'SOLD BY NAFA3NI',
                    Condition: 'New',
                    conditionScore: 10,
                    item_type: 'Laptop Stand',
                    condition: 'New'
                }
            }
        ];

        // 5. Build products with proper category references
        const productsToInsert = [];
        for (const item of officialProducts) {
            const catId = categoryMap[item.categoryName];
            if (!catId) {
                console.warn(`Warning: Category ${item.categoryName} not found in database. Skipping product: ${item.title}`);
                continue;
            }

            productsToInsert.push({
                title: item.title,
                description: item.description,
                price: item.price,
                categoryId: catId,
                userId: storeUser.id,
                images: item.images,
                location: item.location,
                phoneNumber: item.phoneNumber,
                showContactInfo: true,
                soldByNafa3ni: true,
                isVerified: true,
                dynamicAttributes: item.dynamicAttributes
            });
        }

        console.log(`Inserting ${productsToInsert.length} official products...`);

        for (const p of productsToInsert) {
            await pool.query(
                `INSERT INTO products
                 (title, description, price, category_id, user_id, images,
                  show_contact_info, sold_by_nafa3ni, is_verified, dynamic_attributes)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
                [
                    p.title, p.description || null, p.price, p.categoryId, p.userId,
                    p.images || [],
                    p.showContactInfo, p.soldByNafa3ni, p.isVerified,
                    JSON.stringify(p.dynamicAttributes || {})
                ]
            );
        }
        console.log('Official products inserted successfully!');

    } catch (error) {
        console.error('Error generating official products:', error);
    } finally {
        await pool.end();
        console.log('Disconnected from database.');
    }
}

run();

const Product = require("../models/Product");
const Category = require("../models/Category");
const fs = require("fs");
const path = require("path");

const cloudinary = require("../config/cloudinary");

const isCloudinaryConfigured = () => {
    return process.env.CLOUD_NAME && process.env.CLOUD_API_KEY && process.env.CLOUD_API_SECRET;
};

const saveBase64ImageLocally = (base64Str) => {
    if (!base64Str) return null;

    if (base64Str.startsWith("http") || base64Str.startsWith("/uploads")) {
        return base64Str;
    }

    const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
        return base64Str;
    }

    const extension = matches[1].split("/")[1] || "png";
    const buffer = Buffer.from(matches[2], "base64");

    const fileName = `img-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${extension}`;
    const uploadDir = path.join(__dirname, "../public/uploads");

    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    fs.writeFileSync(path.join(uploadDir, fileName), buffer);
    return `/uploads/${fileName}`;
};

const uploadBase64ToCloudinary = async (base64Str) => {
    if (!base64Str) return null;

    if (base64Str.startsWith("http")) {
        return base64Str;
    }

    if (!isCloudinaryConfigured()) {
        return saveBase64ImageLocally(base64Str);
    }

    const result = await cloudinary.uploader.upload(base64Str, {
        folder: "nafa3ni-products"
    });

    return result.secure_url;
};

//Get Product By ID
const getProductById = async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { $inc: { viewCount: 1 } },
            { new: true }
        ).populate('userId').populate('categoryId');

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        res.json(product);
    } catch (error) {
        console.error("Error in getProductById:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    GET ALL PRODUCTS
const getProducts = async (req, res) => {
    try {
        const mongoQuery = {};

        // 1. Category Filter
        if (req.query.category) {
            const catQuery = req.query.category.toLowerCase();
            let regex;
            if (catQuery === 'tops') {
                regex = /clothes|apparel/i;
            } else if (catQuery === 'electronics') {
                regex = /laptop|mobile|electronics/i;
            } else if (catQuery === 'furniture') {
                regex = /appliance|furniture/i;
            } else if (catQuery === 'sports') {
                regex = /sport/i;
            } else if (catQuery === 'books') {
                regex = /book/i;
            }

            if (regex) {
                const matchingCategories = await Category.find({ name: regex });
                const categoryIds = matchingCategories.map(c => c._id);
                mongoQuery.categoryId = { $in: categoryIds };
            } else if (catQuery === 'other') {
                const allCategories = await Category.find({});
                const excludedRegex = /clothes|apparel|laptop|mobile|electronics|appliance|furniture|sport|book/i;
                const otherCategories = allCategories.filter(c => !excludedRegex.test(c.name));
                const categoryIds = otherCategories.map(c => c._id);
                mongoQuery.categoryId = { $in: categoryIds };
            } else {
                const mongoose = require('mongoose');
                if (mongoose.Types.ObjectId.isValid(req.query.category)) {
                    mongoQuery.categoryId = req.query.category;
                } else {
                    const matchingCategories = await Category.find({ name: new RegExp(req.query.category, 'i') });
                    const categoryIds = matchingCategories.map(c => c._id);
                    mongoQuery.categoryId = { $in: categoryIds };
                }
            }
        }

        // 2. Condition Filter
        if (req.query.condition) {
            const cond = req.query.condition.toLowerCase();
            let conditionRegex;
            if (cond === 'new_with_tags' || cond === 'new') {
                conditionRegex = /^new(_with_tags)?$/i;
            } else if (cond === 'good' || cond === 'used') {
                conditionRegex = /^used|good$/i;
            } else {
                conditionRegex = new RegExp('^' + req.query.condition + '$', 'i');
            }

            mongoQuery.$or = [
                { "dynamicAttributes.condition": conditionRegex },
                { "dynamicAttributes.Condition": conditionRegex }
            ];
        }

        // 3. Search Filter
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search, 'i');
            const searchOr = [
                { title: searchRegex },
                { description: searchRegex },
                { "dynamicAttributes.brand": searchRegex },
                { "dynamicAttributes.Brand": searchRegex }
            ];

            if (mongoQuery.$or) {
                mongoQuery.$and = [
                    { $or: mongoQuery.$or },
                    { $or: searchOr }
                ];
                delete mongoQuery.$or;
            } else {
                mongoQuery.$or = searchOr;
            }
        }

        // 4. Price Filter
        if (req.query.minPrice || req.query.maxPrice) {
            mongoQuery.price = {};
            if (req.query.minPrice) {
                mongoQuery.price.$gte = Number(req.query.minPrice);
            }
            if (req.query.maxPrice) {
                mongoQuery.price.$lte = Number(req.query.maxPrice);
            }
        }

        // 5. Sorting & Limit
        let sort = { createdAt: -1 }; // default: newest
        if (req.query.sortBy) {
            if (req.query.sortBy === 'price_asc') {
                sort = { price: 1 };
            } else if (req.query.sortBy === 'price_desc') {
                sort = { price: -1 };
            } else if (req.query.sortBy === 'popular') {
                sort = { viewCount: -1 };
            } else if (req.query.sortBy === 'newest') {
                sort = { createdAt: -1 };
            }
        }

        const limit = parseInt(req.query.limit);
        mongoQuery.status = { $ne: 'sold' };
        const query = Product.find(mongoQuery).sort(sort);
        if (!isNaN(limit) && limit > 0) {
            query.limit(limit);
        }

        const products = await query.populate('categoryId');
        res.json(products);
    } catch (error) {
        console.error("Error in getProducts:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// في productController.js
const getMyProducts = async (req, res) => {
    try {
        // يجلب المنتجات الخاصة باليوزر الذي أرسل الـ Token فقط
        const products = await Product.find({ userId: req.user.id }).populate('userId').populate('categoryId');
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    GET USER PRODUCTS
const getUserProducts = async (req, res) => {
    try {
        const products = await Product.find({ userId: req.params.userId }).populate('userId').populate('categoryId');
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    CREATE PRODUCT (النسخة المعدلة)
// const createProduct = async (req, res) => {
//     try {

//         const { 
//             title, description, price, categoryId, 
//             dynamicAttributes, images, location, 
//             phoneNumber, showContactInfo, userId 
//         } = req.body;


//         if (!title || !price || !categoryId || !location || !phoneNumber || !userId) {
//             return res.status(400).json({
//                 message: "Please provide all required fields (title, price, categoryId, location, phoneNumber, userId)",
//             });
//         }


//         const product = await Product.create({
//             title,
//             description,
//             price,
//             categoryId,
//             dynamicAttributes, 
//             images: images || [],
//             location,
//             phoneNumber,
//             showContactInfo: showContactInfo ?? true, 
//             userId
//         });

//         res.status(201).json({
//             message: "Product Created Successfully",
//             product,
//         });
//     } catch (error) {
//         console.error("Error creating product:", error);
//         res.status(500).json({ message: error.message || "Server Error" });
//     }
// };

// controllers/productController.js

const createProduct = async (req, res) => {
    try {
        const { title, description, price, categoryId, dynamicAttributes, images, location, phoneNumber, showContactInfo } = req.body;

        // التحقق من الحقول الأساسية
        if (!title || !price || !categoryId || !location || !phoneNumber) {
            return res.status(400).json({ message: "Please provide all required fields" });
        }

        // Save base64 images to disk files
        // const savedImages = (images || []).map(img => saveBase64Image(img)).filter(Boolean);

        const savedImages = [];

        for (const img of (images || [])) {
            const uploadedImage = await uploadBase64ToCloudinary(img);

            if (uploadedImage) {
                savedImages.push(uploadedImage);
            }
        }

        // إنشاء المنتج مع ربطه بـ req.user.id
        let product = await Product.create({
            title,
            description,
            price,
            categoryId,
            dynamicAttributes,
            images: savedImages,
            location,
            phoneNumber,
            showContactInfo: showContactInfo ?? true,
            userId: req.user.id, // <-- الربط الصحيح هنا
            soldByNafa3ni: req.user.role === 'admin'
        });
        product = await product.populate('userId');
        product = await product.populate('categoryId');

        res.status(201).json({ message: "Product Created Successfully", product });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    UPDATE PRODUCT
// const updateProduct = async (req, res) => {
//     try {
//         const productId = req.params.id;

//         // استخدام req.body مباشرة سيعمل إذا كان الـ Front-end يرسل البيانات بنفس أسماء الـ Schema
//         const updatedProduct = await Product.findByIdAndUpdate(
//             productId,
//             req.body,
//             { new: true, runValidators: true }
//         );

//         if (!updatedProduct) {
//             return res.status(404).json({ message: "Product not found" });
//         }

//         res.json({
//             message: "Product Updated Successfully",
//             product: updatedProduct
//         });
//     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// };

const updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;

        // 1. البحث عن المنتج أولاً للتأكد من وجوده ولمعرفة صاحبه
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // 2. التحقق من الملكية (Authorization)
        // نقارن الـ userId الخاص بالمنتج مع الـ ID للمستخدم المسجل (القادم من الـ Middleware)
        if (product.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized to update this product" });
        }

        let savedImages = product.images || [];

        if (req.body.images !== undefined) {
            // Save base64 images to disk files
            // savedImages = (req.body.images || []).map(img => saveBase64Image(img)).filter(Boolean);
            savedImages = [];

            for (const img of (req.body.images || [])) {

                // الصورة القديمة موجودة بالفعل
                if (img.startsWith("http")) {
                    savedImages.push(img);
                    continue;
                }

                const uploadedImage = await uploadBase64ToCloudinary(img);

                if (uploadedImage) {
                    savedImages.push(uploadedImage);
                }
            }

            // Delete physical files from disk if they were removed/replaced in this update
            // const deletedImages = (product.images || []).filter(img => !savedImages.includes(img));
            // deletedImages.forEach(img => {
            //     if (img.startsWith("/uploads/")) {
            //         const filePath = path.join(__dirname, "../public", img);
            //         if (fs.existsSync(filePath)) {
            //             try {
            //                 fs.unlinkSync(filePath);
            //             } catch (err) {
            //                 console.error(`Failed to delete physical file: ${filePath}`, err);
            //             }
            //         }
            //     }
            // });
        }

        // 3. تحديد الحقول المسموح بتعديلها فقط (Security Best Practice)
        // هذا يمنع أي مستخدم من تغيير الـ userId أو بيانات النظام
        const allowedUpdates = {
            title: req.body.title,
            description: req.body.description,
            price: req.body.price,
            categoryId: req.body.categoryId,
            dynamicAttributes: req.body.dynamicAttributes,
            images: savedImages,
            location: req.body.location,
            phoneNumber: req.body.phoneNumber,
            showContactInfo: req.body.showContactInfo,
            status: req.body.status
        };

        // تحديث المنتج بالبيانات الجديدة فقط
        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            { $set: allowedUpdates },
            { new: true, runValidators: true }
        ).populate('userId').populate('categoryId');

        res.json({
            message: "Product Updated Successfully",
            product: updatedProduct
        });
    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    DELETE PRODUCT
// const deleteProduct = async (req, res) => {
//     try {
//         const deletedProduct = await Product.findByIdAndDelete(req.params.id);
//         if (!deletedProduct) {
//             return res.status(404).json({ message: "Product not found" });
//         }
//         res.json({ message: "Product Deleted Successfully" });
//     } catch (error) {
//         res.status(500).json({ message: "Server Error" });
//     }
// };
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) return res.status(404).json({ message: "Product not found" });

        // التأكد من أن المستخدم الحالي هو صاحب المنتج
        if (product.userId.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized to delete this product" });
        }

        // Delete associated physical files from disk
        // if (product.images && product.images.length > 0) {
        //     product.images.forEach(img => {
        //         if (img.startsWith("/uploads/")) {
        //             const filePath = path.join(__dirname, "../public", img);
        //             if (fs.existsSync(filePath)) {
        //                 try {
        //                     fs.unlinkSync(filePath);
        //                 } catch (err) {
        //                     console.error(`Failed to delete physical file: ${filePath}`, err);
        //                 }
        //             }
        //         }
        //     });
        // }

        await product.deleteOne(); // أو findByIdAndDelete
        res.json({ message: "Product Deleted Successfully" });
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    GET PRODUCT COUNTS BY CATEGORY
const getCategoryCounts = async (req, res) => {
    try {
        const counts = await Product.aggregate([
            {
                $match: { status: { $ne: 'sold' } }
            },
            {
                $group: {
                    _id: "$categoryId",
                    count: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "_id",
                    foreignField: "_id",
                    as: "category"
                }
            },
            {
                $unwind: {
                    path: "$category",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 1,
                    name: { $ifNull: ["$category.name", "Other"] },
                    count: 1
                }
            }
        ]);
        res.json(counts);
    } catch (error) {
        console.error("Error getting category counts:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = {
    getProducts,
    getUserProducts,
    createProduct,
    getMyProducts,
    updateProduct,
    deleteProduct,
    getProductById,
    getCategoryCounts
};
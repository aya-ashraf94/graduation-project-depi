const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");

const formatOrder = (order, currentUserId) => {
    const orderObj = order.toObject();
    const mapUser = (u) => {
        if (!u) return null;
        const nameParts = (u.name || '').trim().split(/\s+/);
        return {
            id: u._id,
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            avatar: u.avatar || `https://i.pravatar.cc/150?u=${u.email}`,
            isVerified: u.isVerified || false,
            rating: u.rating || 5.0
        };
    };
    
    const buyer = mapUser(orderObj.buyerId);
    const seller = mapUser(orderObj.sellerId);
    
    return {
        id: orderObj._id,
        product: orderObj.productId ? {
            id: orderObj.productId._id,
            title: orderObj.productId.title,
            price: orderObj.productId.price,
            thumbnail: orderObj.productId.images?.[0] || '',
            brand: orderObj.productId.dynamicAttributes?.brand || '',
            condition: orderObj.productId.dynamicAttributes?.condition || '',
            status: orderObj.productId.status,
            sellerId: orderObj.productId.userId
        } : null,
        buyer,
        seller,
        price: orderObj.price,
        status: orderObj.status,
        paymentMethod: orderObj.paymentMethod,
        shippingAddress: orderObj.shippingAddress,
        notes: orderObj.notes,
        createdAt: orderObj.createdAt,
        updatedAt: orderObj.updatedAt
    };
};

const createOrder = async (req, res) => {
    try {
        const buyerId = req.user.id;
        const { productId, paymentMethod, shippingAddress, notes } = req.body;
        
        if (!productId || !paymentMethod || !shippingAddress) {
            return res.status(400).json({ message: "Please provide product, payment method, and shipping address" });
        }
        
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        
        if (product.status === "sold") {
            return res.status(400).json({ message: "This product is already sold" });
        }
        
        const sellerId = product.userId;
        if (buyerId === sellerId.toString()) {
            return res.status(400).json({ message: "You cannot purchase your own product" });
        }
        
        const order = await Order.create({
            productId,
            buyerId,
            sellerId,
            price: product.price,
            paymentMethod,
            shippingAddress,
            notes
        });
        
        product.status = "sold";
        await product.save();
        
        await User.findByIdAndUpdate(buyerId, { $inc: { totalPurchases: 1 } });
        await User.findByIdAndUpdate(sellerId, { $inc: { totalSales: 1 } });
        
        const populatedOrder = await Order.findById(order._id)
            .populate("buyerId", "name email avatar rating isVerified")
            .populate("sellerId", "name email avatar rating isVerified")
            .populate("productId");
            
        res.status(201).json(formatOrder(populatedOrder, buyerId));
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

const getOrdersByUser = async (req, res) => {
    try {
        const userId = req.user.id;
        const orders = await Order.find({
            $or: [{ buyerId: userId }, { sellerId: userId }]
        })
        .populate("buyerId", "name email avatar rating isVerified")
        .populate("sellerId", "name email avatar rating isVerified")
        .populate("productId")
        .sort({ createdAt: -1 });
        
        const result = orders.map(o => formatOrder(o, userId));
        res.json(result);
    } catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

const getOrderById = async (req, res) => {
    try {
        const userId = req.user.id;
        const order = await Order.findById(req.params.id)
            .populate("buyerId", "name email avatar rating isVerified")
            .populate("sellerId", "name email avatar rating isVerified")
            .populate("productId");
            
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        
        if (order.buyerId._id.toString() !== userId && order.sellerId._id.toString() !== userId) {
            return res.status(403).json({ message: "Not authorized to view this order" });
        }
        
        res.json(formatOrder(order, userId));
    } catch (error) {
        console.error("Error fetching order by ID:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

const updateOrder = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, trackingNumber } = req.body;
        
        if (!status) {
            return res.status(400).json({ message: "Please provide order status" });
        }
        
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        
        const isBuyer  = order.buyerId.toString()  === userId;
        const isSeller = order.sellerId.toString() === userId;
        
        if (!isBuyer && !isSeller) {
            return res.status(403).json({ message: "Not authorized to update this order" });
        }
        
        // --- Role-based status enforcement ---
        if (status === "shipped" && !isSeller) {
            return res.status(403).json({ message: "Only the seller can mark an order as shipped" });
        }
        if (status === "delivered" && !isBuyer) {
            return res.status(403).json({ message: "Only the buyer can confirm delivery" });
        }
        
        // --- Revert product to available when order is cancelled ---
        if (status === "cancelled") {
            await Product.findByIdAndUpdate(order.productId, { status: "available" });
        }
        
        order.status = status;
        if (trackingNumber !== undefined) {
            order.trackingNumber = trackingNumber;
        }
        await order.save();
        
        const populatedOrder = await Order.findById(order._id)
            .populate("buyerId",  "name email avatar rating isVerified")
            .populate("sellerId", "name email avatar rating isVerified")
            .populate("productId");
            
        res.json(formatOrder(populatedOrder, userId));
    } catch (error) {
        console.error("Error updating order:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = {
    createOrder,
    getOrdersByUser,
    getOrderById,
    updateOrder
};

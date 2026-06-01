const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { updateUserStats } = require("../utils/userStats");

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
        
        await updateUserStats(buyerId);
        await updateUserStats(sellerId);

        // Trigger notification to the seller
        const buyerUser = await User.findById(buyerId);
        const buyerName = buyerUser ? buyerUser.name : "A buyer";
        await Notification.create({
            userId: sellerId,
            type: "order_update",
            title: "New Order Placed",
            body: `${buyerName} placed an order for "${product.title}".`,
            linkedEntityId: order._id.toString(),
            linkedRoute: "/profile/me?tab=orders&view=sales"
        });
        
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
        
        // --- Revert product to active when order is cancelled ---
        if (status === "cancelled") {
            await Product.findByIdAndUpdate(order.productId, { status: "active" });
        }
        
        order.status = status;
        if (trackingNumber !== undefined) {
            order.trackingNumber = trackingNumber;
        }
        await order.save();
        
        await updateUserStats(order.buyerId);
        await updateUserStats(order.sellerId);

        // Trigger notifications for status transitions
        try {
            const product = await Product.findById(order.productId);
            const productTitle = product ? product.title : "item";

            if (status === "shipped") {
                await Notification.create({
                    userId: order.buyerId,
                    type: "order_update",
                    title: "Order Shipped",
                    body: `Your order for "${productTitle}" has been shipped!`,
                    linkedEntityId: order._id.toString(),
                    linkedRoute: "/profile/me?tab=orders&view=purchases"
                });
            } else if (status === "delivered") {
                await Notification.create({
                    userId: order.sellerId,
                    type: "order_update",
                    title: "Order Delivered",
                    body: `Your sale of "${productTitle}" has been delivered and confirmed by the buyer!`,
                    linkedEntityId: order._id.toString(),
                    linkedRoute: "/profile/me?tab=orders&view=sales"
                });
            } else if (status === "cancelled") {
                const recipientId = isBuyer ? order.sellerId : order.buyerId;
                const initiator = isBuyer ? "Buyer" : "Seller";
                await Notification.create({
                    userId: recipientId,
                    type: "order_update",
                    title: "Order Cancelled",
                    body: `${initiator} cancelled the order for "${productTitle}".`,
                    linkedEntityId: order._id.toString(),
                    linkedRoute: isBuyer ? "/profile/me?tab=orders&view=sales" : "/profile/me?tab=orders&view=purchases"
                });
            }
        } catch (notifErr) {
            console.error("Error triggering order notification:", notifErr);
        }
        
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

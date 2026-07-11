const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const cookieParser = require("cookie-parser");
const { connectDB } = require("./config/db");

dotenv.config();

connectDB();

const app = express();
app.use(cookieParser());

require("./config/cloudinary");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    message: "Too many requests from this IP, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

app.use(
  cors({
    origin: ["http://localhost:4200"],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  })
);

app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

app.use("/api/auth", authLimiter);

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/categories", require("./routes/categoryRoutes"));

app.use("/api/conversations", require("./routes/conversationRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));
app.use("/api/support", require("./routes/supportRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/settings", require("./routes/settingsRoutes"));
app.use("/api/wishlist", require("./routes/wishlistRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/offers", require("./routes/offerRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/users/block", require("./routes/blockRoutes"));
app.use("/api/flash-sales", require("./routes/flashSaleRoutes"));
app.use("/api/locations", require("./routes/locationRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/payouts", require("./routes/payoutRoutes"));
app.use("/api/refunds", require("./routes/refundRoutes"));
app.use("/api/featured", require("./routes/featuredRoutes"));
app.use("/api/tiers", require("./routes/tierRoutes"));

const { getPool } = require("./config/db");

app.get("/api/health", async (req, res) => {
  try {
    const pool = getPool();
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    res.json({
      status: "healthy",
      database: "connected",
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      database: "disconnected",
      error: error.message || error
    });
  }
});

app.get("/", (req, res) => {
  res.send("API Running...");
});

const http = require("http");
const { Server } = require("socket.io");

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

const jwt = require("jsonwebtoken");
const db = require("./db");
const { conversationParticipants } = require("./db/schema");
const { and, eq } = require("drizzle-orm");

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:4200"],
    methods: ["GET", "POST"],
  },
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    socket.userId = null;
    return next();
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    socket.userId = null;
    next();
  }
});

const onlineUsers = new Map(); // userId -> Set of socket.ids

io.on("connection", (socket) => {
  console.log(`Socket Connected: ${socket.id} (User: ${socket.userId})`);

  // Track online user (skip anonymous)
  if (socket.userId) {
    if (!onlineUsers.has(socket.userId)) {
      onlineUsers.set(socket.userId, new Set());
    }
    onlineUsers.get(socket.userId).add(socket.id);

    // Send the list of current online users to this newly connected user
    socket.emit("initial_online_users", Array.from(onlineUsers.keys()));

    // Broadcast to all other users that this user is online
    socket.broadcast.emit("user_status_changed", { userId: socket.userId, status: "online" });
  }

  socket.on("join_conversation", async (conversationId) => {
    try {
      const [participant] = await db.select()
        .from(conversationParticipants)
        .where(and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, socket.userId)
        ))
        .limit(1);

      if (!participant) {
        console.log(`Unauthorized socket join attempt by user ${socket.userId} to room ${conversationId}`);
        return;
      }

      socket.join(conversationId);
      console.log(`User ${socket.userId} joined room: ${conversationId}`);
    } catch (err) {
      console.error("Error in join_conversation socket handler:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log(`Socket Disconnected: ${socket.id}`);
    if (socket.userId) {
      const userSockets = onlineUsers.get(socket.userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(socket.userId);
          // Broadcast to everyone that this user is offline
          io.emit("user_status_changed", { userId: socket.userId, status: "offline" });
        }
      }
    }
  });
});

// Attach io to app so controller routes can trigger socket events on message insertion
app.set("io", io);

// ── Scheduled Tasks ────────────────────────────────────────────────────
const { checkAndNotifyFlashSales } = require("./controllers/flashSaleController");
const { processTierRenewals } = require("./controllers/tierController");
const { processExpiredOffers } = require("./controllers/offerController");
const { processAutoPayouts } = require("./controllers/payoutController");

setInterval(() => checkAndNotifyFlashSales(io), 60 * 1000); // Every minute — flash sales
setInterval(() => processExpiredOffers(), 60 * 1000); // Every minute — offer expiry
setInterval(() => processTierRenewals(), 60 * 60 * 1000); // Every hour — tier renewals & notifications
setInterval(async () => {
  try {
    const result = await processAutoPayouts();
    if (result && result.processed !== undefined) {
      console.log(`[AutoPayout] Processed ${result.processed} payout(s)`);
    }
  } catch (e) {
    console.error("[AutoPayout] Scheduler error:", e.message);
  }
}, 60 * 60 * 1000); // Every hour — auto-payouts

// Cleanup expired reservations every 2 minutes
const { cleanupExpiredReservations } = require("./controllers/productController");
setInterval(cleanupExpiredReservations, 2 * 60 * 1000);

// Auto-confirm delivery for orders shipped more than 14 days ago
const { autoConfirmDelivery } = require("./controllers/orderController");
setInterval(async () => {
  try {
    const result = await autoConfirmDelivery();
    if (result && result.confirmed !== undefined) {
      console.log(`[AutoConfirm] Auto-confirmed ${result.confirmed} order(s) as delivered`);
    }
  } catch (e) {
    console.error("[AutoConfirm] Scheduler error:", e.message);
  }
}, 15 * 60 * 1000); // Every 15 minutes

server.listen(PORT, () => {
  console.log(`Server Running On Port ${PORT}`);
});

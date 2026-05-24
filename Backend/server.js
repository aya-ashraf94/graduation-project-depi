const express = require("express");

const dotenv = require("dotenv");

const cors = require("cors");

const connectDB = require("./config/db");

dotenv.config();

connectDB();

const app = express();

// MIDDLEWARE
app.use(cors());

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ROUTES
app.use("/api/auth", require("./routes/authRoutes"));

app.use("/api/products", require("./routes/productRoutes"));

app.use("/api/categories", require("./routes/categoryRoutes"));

// HOME ROUTE
app.get("/", (req, res) => {
    res.send("API Running...");
});

// SERVER
const PORT = process.env.PORT || 4200;

app.listen(PORT, () => {
    console.log(`Server Running On Port ${PORT}`);
});

// const jwt = require("jsonwebtoken");

// const auth = (req, res, next) => {
//     const token = req.header("x-auth-token");
//     if (!token) {
//         return res.status(401).json({ msg: "No token, authorization denied" });
//     }

//     try {
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         req.user = decoded.user;
//         next();
//     } catch (err) {
//         res.status(401).json({ msg: "Token is not valid" });
//     }
// };

// module.exports = auth;

// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) return res.status(401).json({ message: "No token, authorization denied" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // هنا وضعنا الـ ID داخل req.user
        next();
    } catch (err) {
        res.status(401).json({ message: "Token is not valid" });
    }
};

module.exports = authMiddleware;
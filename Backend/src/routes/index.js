const express = require("express");
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const productRoutes = require("./productRoutes");
const billRoutes = require("./billRoutes");
const dueRoutes = require("./dueRoutes");
const dashboardRoutes = require("./dashboardRoutes");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.use("/auth", authRoutes);
router.use(protect);
router.use("/users", userRoutes);
router.use("/products", productRoutes);
router.use("/bills", billRoutes);
router.use("/dues", dueRoutes);
router.use("/dashboard", dashboardRoutes);

module.exports = router;

const express = require("express");
const { getDashboardSummary } = require("../controllers/dashboardController");
const { authorize } = require("../middlewares/authMiddleware");
const { USER_ROLES } = require("../constants/roles");

const router = express.Router();

router.get("/summary", authorize(USER_ROLES.SUPERADMIN, USER_ROLES.ADMIN), getDashboardSummary);

module.exports = router;

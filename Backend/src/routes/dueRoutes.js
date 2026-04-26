const express = require("express");
const { getDues, getDueById, collectDue } = require("../controllers/dueController");
const { authorize } = require("../middlewares/authMiddleware");
const { USER_ROLES } = require("../constants/roles");

const router = express.Router();

router.route("/").get(getDues);
router.route("/:id").get(getDueById);
router.patch("/:id/collect", authorize(USER_ROLES.SUPERADMIN, USER_ROLES.ADMIN), collectDue);

module.exports = router;

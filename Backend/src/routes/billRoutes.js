const express = require("express");
const {
    createBill,
    getBills,
    getBillById,
    collectBillPayment,
} = require("../controllers/billController");
const { authorize } = require("../middlewares/authMiddleware");
const { USER_ROLES } = require("../constants/roles");

const router = express.Router();

router.route("/").post(authorize(USER_ROLES.SUPERADMIN, USER_ROLES.ADMIN), createBill).get(getBills);
router.get("/:id", getBillById);
router.patch("/:id/collect", authorize(USER_ROLES.SUPERADMIN, USER_ROLES.ADMIN), collectBillPayment);

module.exports = router;

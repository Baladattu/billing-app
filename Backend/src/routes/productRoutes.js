const express = require("express");
const {
    createProduct,
    getProducts,
    getProductById,
    updateProduct,
} = require("../controllers/productController");
const { authorize } = require("../middlewares/authMiddleware");
const { USER_ROLES } = require("../constants/roles");

const router = express.Router();

router.route("/").post(authorize(USER_ROLES.SUPERADMIN, USER_ROLES.ADMIN), createProduct).get(getProducts);
router.route("/:id").get(getProductById).patch(authorize(USER_ROLES.SUPERADMIN, USER_ROLES.ADMIN), updateProduct);

module.exports = router;

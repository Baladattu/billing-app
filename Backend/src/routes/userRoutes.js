const express = require("express");
const {
    createUser,
    getUsers,
    getUserById,
    updateUser,
} = require("../controllers/userController");
const { authorize, authorizeSelfOrRoles } = require("../middlewares/authMiddleware");
const { USER_ROLES } = require("../constants/roles");

const router = express.Router();

router
    .route("/")
    .post(authorize(USER_ROLES.SUPERADMIN, USER_ROLES.ADMIN), createUser)
    .get(authorize(USER_ROLES.SUPERADMIN, USER_ROLES.ADMIN), getUsers);

router
    .route("/:id")
    .get(authorizeSelfOrRoles(USER_ROLES.SUPERADMIN, USER_ROLES.ADMIN), getUserById)
    .patch(authorizeSelfOrRoles(USER_ROLES.SUPERADMIN, USER_ROLES.ADMIN), updateUser);

module.exports = router;

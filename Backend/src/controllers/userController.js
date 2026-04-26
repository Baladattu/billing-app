const User = require("../models/User");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { created, success, updated } = require("../utils/response");
const { USER_ROLES } = require("../constants/roles");

const getPagination = (query) => {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};

const sanitizeUser = (user) => {
    const safeUser = { ...user };
    delete safeUser.password;
    return safeUser;
};

const createUser = asyncHandler(async (req, res) => {
    if (req.user.role === USER_ROLES.ADMIN) {
        if (req.body.role && req.body.role !== USER_ROLES.CUSTOMER) {
            throw new AppError("Admin can only create customer users.", 403);
        }
        req.body.role = USER_ROLES.CUSTOMER;
    }

    const user = await User.create(req.body);
    return created(res, { user: sanitizeUser(user.toObject()) }, "User created successfully");
});

const getUsers = asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req.query);
    const filter = {};

    if (req.query.role) {
        filter.role = req.query.role;
    }
    if (req.query.isActive !== undefined) {
        filter.isActive = req.query.isActive === "true";
    }

    if (req.user.role === USER_ROLES.ADMIN) {
        filter.role = { $ne: USER_ROLES.SUPERADMIN };
    }

    const [users, total] = await Promise.all([
        User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        User.countDocuments(filter),
    ]);

    return success(res, {
        users: users.map(sanitizeUser),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1,
        },
    });
});

const getUserById = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).lean();
    if (!user) {
        throw new AppError("User not found", 404);
    }

    if (req.user.role === USER_ROLES.CUSTOMER && String(user._id) !== req.user.id) {
        throw new AppError("Forbidden. You can only access your own data.", 403);
    }

    if (req.user.role === USER_ROLES.ADMIN && user.role === USER_ROLES.SUPERADMIN) {
        throw new AppError("Forbidden. Admin cannot access superadmin users.", 403);
    }

    return success(res, { user: sanitizeUser(user) });
});

const updateUser = asyncHandler(async (req, res) => {
    const existingUser = await User.findById(req.params.id).select("+password");
    if (!existingUser) {
        throw new AppError("User not found", 404);
    }

    if (req.user.role === USER_ROLES.CUSTOMER && String(existingUser._id) !== req.user.id) {
        throw new AppError("Forbidden. You can only update your own data.", 403);
    }

    if (req.user.role === USER_ROLES.ADMIN) {
        if (existingUser.role === USER_ROLES.SUPERADMIN) {
            throw new AppError("Forbidden. Admin cannot update superadmin users.", 403);
        }
        if (req.body.role && req.body.role !== USER_ROLES.CUSTOMER) {
            throw new AppError("Admin can only assign customer role.", 403);
        }
    }

    if (req.user.role === USER_ROLES.CUSTOMER) {
        const allowedFields = ["name", "phone", "address", "notes", "password"];
        const payloadKeys = Object.keys(req.body);
        const blockedKey = payloadKeys.find((key) => !allowedFields.includes(key));
        if (blockedKey) {
            throw new AppError(`Field not allowed for customer update: ${blockedKey}`, 403);
        }
    }

    const updatableFields = ["name", "email", "phone", "role", "isActive", "address", "notes"];
    updatableFields.forEach((field) => {
        if (req.body[field] !== undefined) {
            existingUser[field] = req.body[field];
        }
    });

    if (req.body.password !== undefined) {
        if (!req.body.password || String(req.body.password).length < 6) {
            throw new AppError("password must be at least 6 characters.", 400);
        }
        existingUser.password = req.body.password;
    }

    await existingUser.save();

    const user = await User.findById(existingUser._id).lean();
    return updated(res, { user: sanitizeUser(user) }, "User updated successfully");
});

module.exports = {
    createUser,
    getUsers,
    getUserById,
    updateUser,
};

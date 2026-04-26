const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { env } = require("../config/env");

const protect = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
        throw new AppError("Unauthorized. Missing bearer token.", 401);
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
        decoded = jwt.verify(token, env.jwtSecret);
    } catch (error) {
        throw new AppError("Unauthorized. Invalid or expired token.", 401);
    }

    const user = await User.findById(decoded.sub).lean();
    if (!user || !user.isActive) {
        throw new AppError("Unauthorized. User no longer available.", 401);
    }

    req.user = {
        id: String(user._id),
        role: user.role,
        name: user.name,
        email: user.email,
    };

    next();
});

const authorize = (...allowedRoles) => (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
        return next(new AppError("Forbidden. You do not have access to this resource.", 403));
    }
    return next();
};

const authorizeSelfOrRoles = (...allowedRoles) => (req, res, next) => {
    if (!req.user) {
        return next(new AppError("Unauthorized.", 401));
    }

    if (allowedRoles.includes(req.user.role) || req.user.id === req.params.id) {
        return next();
    }

    return next(new AppError("Forbidden. You can only access your own data.", 403));
};

module.exports = {
    protect,
    authorize,
    authorizeSelfOrRoles,
};

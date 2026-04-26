const User = require("../models/User");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");
const { success } = require("../utils/response");
const { signAccessToken } = require("../utils/jwt");

const sanitizeUser = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
});

const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new AppError("email and password are required.", 400);
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!user) {
        throw new AppError("Invalid credentials.", 401);
    }

    if (!user.isActive) {
        throw new AppError("Your account is disabled. Please contact support.", 403);
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
        throw new AppError("Invalid credentials.", 401);
    }

    const token = signAccessToken(user);
    return success(res, { token, user: sanitizeUser(user) }, "Login successful");
});

module.exports = {
    login,
};

const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

const signAccessToken = (user) =>
    jwt.sign(
        {
            sub: user._id,
            role: user.role,
        },
        env.jwtSecret,
        {
            expiresIn: env.jwtExpiresIn,
        }
    );

module.exports = {
    signAccessToken,
};

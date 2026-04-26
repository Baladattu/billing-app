const parseBoolean = (value, fallback = false) => {
    if (value === undefined) {
        return fallback;
    }

    return String(value).toLowerCase() === "true";
};

const parseNumber = (value, fallback) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
};

const parseOrigins = (value) => {
    if (!value) {
        return [];
    }

    return value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
};

const env = {
    nodeEnv: process.env.NODE_ENV || "development",
    port: parseNumber(process.env.PORT, 3000),
    trustProxy: parseBoolean(process.env.TRUST_PROXY, false),
    corsAllowedOrigins: parseOrigins(process.env.CORS_ALLOWED_ORIGINS),
    corsAllowCredentials: parseBoolean(process.env.CORS_ALLOW_CREDENTIALS, true),
    jsonBodyLimit: process.env.JSON_BODY_LIMIT || "100kb",
    keepAliveTimeoutMs: parseNumber(process.env.SERVER_KEEP_ALIVE_TIMEOUT_MS, 65000),
    headersTimeoutMs: parseNumber(process.env.SERVER_HEADERS_TIMEOUT_MS, 66000),
    requestTimeoutMs: parseNumber(process.env.SERVER_REQUEST_TIMEOUT_MS, 30000),
};

const validateEnv = () => {
    const requiredVars = ["MONGO_URI"];
    const missingVars = requiredVars.filter((key) => !process.env[key]);

    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(", ")}`);
    }

    if (env.nodeEnv === "production" && env.corsAllowedOrigins.length === 0) {
        throw new Error("CORS_ALLOWED_ORIGINS must be set in production.");
    }
};

module.exports = {
    env,
    validateEnv,
};

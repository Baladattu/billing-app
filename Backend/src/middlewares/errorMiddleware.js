module.exports = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    const isProduction = process.env.NODE_ENV === "production";
    let message = err.isOperational ? err.message : "Internal Server Error";

    if (err.name === "ValidationError") {
        statusCode = 400;
        message = Object.values(err.errors)
            .map((item) => item.message)
            .join(", ");
    }

    if (err.code === 11000) {
        statusCode = 409;
        const duplicateField = Object.keys(err.keyPattern || {})[0] || "field";
        message = `${duplicateField} already exists.`;
    }

    if (err.name === "CastError") {
        statusCode = 400;
        message = `Invalid ${err.path}: ${err.value}`;
    }

    console.error("[error]", {
        method: req.method,
        path: req.originalUrl,
        statusCode,
        message: err.message || message,
    });

    const payload = {
        success: false,
        message,
    };

    if (!isProduction) {
        payload.stack = err.stack;
    }

    res.status(statusCode).json(payload);
};

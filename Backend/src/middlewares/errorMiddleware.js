module.exports = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const isProduction = process.env.NODE_ENV === "production";

    console.error("[error]", {
        method: req.method,
        path: req.originalUrl,
        statusCode,
        message: err.message,
    });

    const payload = {
        success: false,
        message: err.isOperational ? err.message : "Internal Server Error",
    };

    if (!isProduction) {
        payload.stack = err.stack;
    }

    res.status(statusCode).json(payload);
};

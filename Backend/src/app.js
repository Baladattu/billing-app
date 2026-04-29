const express = require('express');
const { error } = require('./utils/response');
const AppError = require("./utils/AppError");
const errorMiddleware = require('./middlewares/errorMiddleware');
const apiRoutes = require("./routes");
const { swaggerUi, swaggerSpec } = require("./docs/swagger");
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
const mongoose = require("mongoose");
const { env } = require("./config/env");

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", env.trustProxy);

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) {
            callback(null, true);
            return;
        }

        if (env.corsAllowedOrigins.length === 0 || env.corsAllowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }

        callback(new AppError("Not allowed by CORS", 403));
    },
    credentials: env.corsAllowCredentials,
};

app.use(express.json({ limit: env.jsonBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: env.jsonBodyLimit }));
app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"));
app.use(cors(corsOptions));
app.use(helmet());

app.get('/health', (req, res) => {
    const readyStateMap = {
        0: "disconnected",
        1: "connected",
        2: "connecting",
        3: "disconnecting",
    };

    const dbState = readyStateMap[mongoose.connection.readyState] || "unknown";
    const isDbReady = mongoose.connection.readyState === 1;

    res.status(isDbReady ? 200 : 503).json({
        status: isDbReady ? 'OK' : "DEGRADED",
        message: 'Server is running',
        database: dbState,
        timestamp: new Date().toISOString()
    });
});

app.get('/', (req, res) => {
    res.send('Welcome to the Billing App Backend!');
});

app.get('/error', (req, res) => {
    return error(res, "Something Failed", 500);
});

app.get("/api-docs.json", (req, res) => {
    res.json(swaggerSpec);
});
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

app.use("/api/v1", apiRoutes);

app.use((req, res, next) => {
    next(new AppError(`Route not found: ${req.originalUrl}`, 404));
});

app.use(errorMiddleware);

module.exports = app;

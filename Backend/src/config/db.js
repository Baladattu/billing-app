const mongoose = require("mongoose");

const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_RETRY_DELAY_MS = 2000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getMongoOptions = () => ({
    maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 20),
    minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE || 5),
    serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 8000),
    socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 45000),
    autoIndex: process.env.NODE_ENV !== "production",
});

const registerConnectionEvents = () => {
    mongoose.connection.on("connected", () => {
        console.log("[mongo] Connected");
    });

    mongoose.connection.on("disconnected", () => {
        console.warn("[mongo] Disconnected");
    });

    mongoose.connection.on("reconnected", () => {
        console.log("[mongo] Reconnected");
    });

    mongoose.connection.on("error", (error) => {
        console.error("[mongo] Connection error:", error.message);
    });
};

const connectDB = async () => {
    const uri = process.env.MONGO_URI;

    if (!uri) {
        throw new Error("MONGO_URI is missing in environment variables.");
    }

    registerConnectionEvents();

    const maxRetries = Number(process.env.MONGO_CONNECT_MAX_RETRIES || DEFAULT_MAX_RETRIES);
    const baseDelay = Number(process.env.MONGO_RETRY_DELAY_MS || DEFAULT_RETRY_DELAY_MS);
    const options = getMongoOptions();

    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
        try {
            await mongoose.connect(uri, options);
            return;
        } catch (error) {
            const isLastAttempt = attempt === maxRetries;
            console.error(`[mongo] Initial connect attempt ${attempt}/${maxRetries} failed: ${error.message}`);

            if (isLastAttempt) {
                throw error;
            }

            const delay = baseDelay * attempt;
            console.log(`[mongo] Retrying in ${delay}ms...`);
            await sleep(delay);
        }
    }
};

const closeDB = async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
        console.log("[mongo] Connection closed");
    }
};

module.exports = {
    connectDB,
    closeDB,
};

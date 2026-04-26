require("dotenv").config();
const app = require('./app');
const { connectDB, closeDB } = require("./config/db");
const { env, validateEnv } = require("./config/env");

let server;

const shutdown = async (signalOrError) => {
    try {
        if (signalOrError) {
            console.log(`[server] Shutdown triggered by: ${signalOrError}`);
        }

        if (server) {
            await new Promise((resolve, reject) => {
                server.close((error) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve();
                });
            });
            console.log("[server] HTTP server closed");
        }

        await closeDB();
        process.exit(0);
    } catch (error) {
        console.error("[server] Graceful shutdown failed:", error);
        process.exit(1);
    }
};

const startServer = async () => {
    try {
        validateEnv();
        await connectDB();

        server = app.listen(env.port, () => {
            console.log("Server is running on port", env.port);
        });

        server.keepAliveTimeout = env.keepAliveTimeoutMs;
        server.headersTimeout = env.headersTimeoutMs;
        server.requestTimeout = env.requestTimeoutMs;
    } catch (error) {
        console.error("[server] Failed to start:", error);
        process.exit(1);
    }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => shutdown(`unhandledRejection: ${reason}`));
process.on("uncaughtException", (error) => shutdown(`uncaughtException: ${error.message}`));

startServer();

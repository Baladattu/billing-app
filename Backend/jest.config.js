module.exports = {
    testEnvironment: "node",
    clearMocks: true,
    restoreMocks: true,
    roots: ["<rootDir>/tests"],
    setupFiles: ["<rootDir>/tests/setupEnv.js"],
    testTimeout: 120000,
};
